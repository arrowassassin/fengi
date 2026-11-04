import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { draftContent, validateDraft } from "../../src/server/content-draft";

const provider = vi.hoisted(() => ({ options: vi.fn(), invoke: vi.fn() }));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    constructor(options: unknown) {
      provider.options(options);
    }
    invoke = provider.invoke;
  },
}));

describe("private content pipeline", () => {
  it("passes the runtime model to NVIDIA through the LangChain adapter by default", async () => {
    provider.invoke.mockResolvedValueOnce({
      content: JSON.stringify({
        title: "Small wonders",
        description: "Three familiar little worlds.",
        categoryIds: ["planets", "chess", "si"],
      }),
    });
    const result = await draftContent("runtime", {
      NVIDIA_API_KEY: "test-only",
      NVIDIA_MODEL: "configured-runtime-model",
    });
    expect(provider.options).toHaveBeenLastCalledWith(
      expect.objectContaining({
        model: "configured-runtime-model",
        configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
        useResponsesApi: false,
        maxTokens: 4096,
        streaming: true,
        modelKwargs: { reasoning_effort: "low" },
        timeout: 60000,
        maxRetries: 1,
      }),
    );
    expect(result.source).toBe("nvidia");
    expect(result.reason).toBe("generated");
  });
  it("uses a bounded total deadline and supports explicit high reasoning", async () => {
    const deadline = vi.spyOn(AbortSignal, "timeout");
    provider.invoke.mockRejectedValueOnce(new Error("private provider failure"));
    try {
      const result = await draftContent("s", {
        NVIDIA_API_KEY: "test-only",
        NVIDIA_MODEL: "configured-test-model",
        NVIDIA_REASONING_EFFORT: "high",
      });
      expect(provider.options).toHaveBeenLastCalledWith(
        expect.objectContaining({ modelKwargs: { reasoning_effort: "high" } }),
      );
      expect(deadline).toHaveBeenCalledWith(90000);
      expect(provider.invoke).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(result.source).toBe("deterministic");
      expect(JSON.stringify(result)).not.toContain("private provider failure");
    } finally {
      deadline.mockRestore();
    }
  });
  it("rejects unsupported reasoning configuration before calling the provider", async () => {
    const calls = provider.invoke.mock.calls.length;
    const result = await draftContent("s", {
      NVIDIA_API_KEY: "test-only",
      NVIDIA_MODEL: "configured-test-model",
      NVIDIA_REASONING_EFFORT: "unsupported",
    });
    expect(result.reason).toBe("provider-or-validation-failure");
    expect(provider.invoke.mock.calls).toHaveLength(calls);
  });
  it.each([
    { content: null, response_metadata: { finish_reason: "length" } },
    { content: "", response_metadata: { finish_reason: "length" } },
    { content: '{"title":', response_metadata: { finish_reason: "length" } },
    {
      content: JSON.stringify({
        title: "Small wonders",
        description: "Three familiar little worlds.",
        categoryIds: ["planets", "chess", "si"],
      }),
      response_metadata: { finish_reason: "length" },
    },
  ])("rejects length-truncated output even when it looks like valid JSON", async (response) => {
    provider.invoke.mockResolvedValueOnce(response);
    const result = await draftContent("s", {
      NVIDIA_API_KEY: "test-only",
      NVIDIA_MODEL: "configured-test-model",
    });
    expect(result.source).toBe("deterministic");
    expect(result.reason).toBe("provider-or-validation-failure");
  });
  it("runs without a key and without invoking a model", async () => {
    const invoke = vi.fn();
    const draft = await draftContent("seed", {}, { invoke });
    expect(draft.source).toBe("deterministic");
    expect(draft.reason).toBe("missing-key");
    expect(invoke).not.toHaveBeenCalled();
    expect((await draftContent("seed", { FENGI_AI_ENABLED: "true" })).reason).toBe("missing-key");
  });
  it("supports an explicit off switch and requires a configured model", async () => {
    const invoke = vi.fn();
    expect(
      (
        await draftContent(
          "s",
          {
            FENGI_AI_ENABLED: "false",
            NVIDIA_API_KEY: "test-only",
            NVIDIA_MODEL: "configured-test-model",
          },
          { invoke },
        )
      ).reason,
    ).toBe("disabled");
    expect((await draftContent("s", { NVIDIA_API_KEY: "test-only" }, { invoke })).reason).toBe(
      "missing-model",
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  it("validates a model draft and copies only canonical scoring", async () => {
    const result = await draftContent(
      "s",
      { NVIDIA_API_KEY: "test-only", NVIDIA_MODEL: "configured-test-model" },
      {
        invoke: async () =>
          JSON.stringify({
            title: "Small wonders",
            description: "A collection of familiar little worlds.",
            categoryIds: ["planets", "chess", "si"],
          }),
      },
    );
    expect(result.source).toBe("nvidia");
    expect(result.status).toBe("review-required");
    expect(result.categories[0].answers[0].word).toBe("Earth");
  });
  it("accepts a single JSON code fence and still validates its contents", async () => {
    const env = { NVIDIA_API_KEY: "test-only", NVIDIA_MODEL: "configured-test-model" };
    const draft = {
      title: "Small wonders",
      description: "Three familiar little worlds.",
      categoryIds: ["planets", "chess", "si"],
    };
    for (const fence of ["```json", "```JSON", "```"]) {
      const output = `${fence}\n${JSON.stringify(draft)}\n\x60\x60\x60`;
      expect((await draftContent("s", env, { invoke: async () => output })).source).toBe("nvidia");
      expect(
        (await draftContent("s", env, { invoke: async () => `Here you go: ${output}` })).source,
      ).toBe("deterministic");
      expect(
        (await draftContent("s", env, { invoke: async () => `${output} Enjoy!` })).source,
      ).toBe("deterministic");
    }
    const unsafe = `\x60\x60\x60json\n${JSON.stringify({ ...draft, points: 999 })}\n\x60\x60\x60`;
    expect((await draftContent("s", env, { invoke: async () => unsafe })).source).toBe(
      "deterministic",
    );
  });
  it.each([
    "not json",
    JSON.stringify({
      title: "Hello",
      description: "valid description",
      categoryIds: ["unknown", "chess", "si"],
    }),
    JSON.stringify({
      title: "Hello",
      description: "valid description",
      categoryIds: ["si", "si", "si"],
    }),
    "x".repeat(9000),
  ])("falls back on malformed or unsafe output", async (output) => {
    const result = await draftContent(
      "s",
      {
        FENGI_AI_ENABLED: "true",
        NVIDIA_API_KEY: "test-only",
        NVIDIA_MODEL: "configured-test-model",
      },
      { invoke: async () => output },
    );
    expect(result.reason).toBe("provider-or-validation-failure");
    expect(result.categories).toHaveLength(3);
  });
  it("contains provider failures without leaking error text", async () => {
    const result = await draftContent(
      "s",
      {
        FENGI_AI_ENABLED: "true",
        NVIDIA_API_KEY: "test-only",
        NVIDIA_MODEL: "configured-test-model",
      },
      {
        invoke: async () => {
          throw new Error("secret in provider error");
        },
      },
    );
    expect(JSON.stringify(result)).not.toContain("secret in provider error");
  });
  it("rejects model-supplied scores and extra fields", () => {
    expect(() =>
      validateDraft({
        title: "Hello",
        description: "A valid description",
        categoryIds: ["si", "chess", "planets"],
        points: 999,
      }),
    ).toThrow();
  });
  it("keeps server dependencies out of client game code", () => {
    function scan(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? scan(join(dir, e.name)) : [join(dir, e.name)],
      );
    }
    for (const path of [...scan("src/games"), ...scan("src/components")]) {
      const content = readFileSync(path, "utf8");
      expect(content).not.toMatch(/@langchain|NVIDIA_API_KEY|server\/content-draft/);
    }
  });
});
