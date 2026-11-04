import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { draftContent, validateDraft } from "../../src/server/content-draft";

describe("private content pipeline", () => {
  it("runs without a key and without invoking a model", async () => {
    const invoke = vi.fn();
    const draft = await draftContent("seed", {}, { invoke });
    expect(draft.source).toBe("deterministic");
    expect(draft.reason).toBe("disabled");
    expect(invoke).not.toHaveBeenCalled();
    expect((await draftContent("seed", { FENGI_AI_ENABLED: "true" })).reason).toBe("missing-key");
  });
  it("validates a model draft and copies only canonical scoring", async () => {
    const result = await draftContent(
      "s",
      { FENGI_AI_ENABLED: "true", NVIDIA_API_KEY: "test-only" },
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
      { FENGI_AI_ENABLED: "true", NVIDIA_API_KEY: "test-only" },
      { invoke: async () => output },
    );
    expect(result.reason).toBe("provider-or-validation-failure");
    expect(result.categories).toHaveLength(3);
  });
  it("contains provider failures without leaking error text", async () => {
    const result = await draftContent(
      "s",
      { FENGI_AI_ENABLED: "true", NVIDIA_API_KEY: "test-only" },
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
