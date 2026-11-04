import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { type GeneratedPack, packSchema, validatePack } from "../games/generated-content";
import { categories } from "../games/odd/content";
import { dailyPrompts } from "../games/odd/engine";
import { gardenSchema, validateGarden } from "./garden-draft";

const draftSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(5).max(240),
    categoryIds: z.array(z.string()).length(3),
    garden: gardenSchema.optional(),
    pack: packSchema.optional(),
  })
  .strict();
export type DraftResult = {
  source: "nvidia" | "deterministic";
  status: "review-required";
  reason:
    | "generated"
    | "disabled"
    | "missing-key"
    | "missing-model"
    | "provider-or-validation-failure";
  title: string;
  description: string;
  categories: typeof categories;
  diagnostics?: {
    stage: "provider-request" | "response-shape" | "schema-validation";
    status?: number;
  };
  pack?: GeneratedPack;
  garden?: ReturnType<typeof validateGarden>;
};
export type DraftModel = { invoke: (prompt: string) => Promise<string> };
export function validateDraft(value: unknown) {
  const draft = draftSchema.parse(value);
  if (draft.pack) draft.pack = validatePack(draft.pack);
  if (draft.garden) draft.garden = validateGarden(draft.garden);
  if (
    new Set(draft.categoryIds).size !== 3 ||
    draft.categoryIds.some((id) => !categories.some((c) => c.id === id))
  )
    throw new Error("Unrecognized category selection");
  return {
    ...draft,
    categories: draft.categoryIds.map(
      (id) => categories.find((c) => c.id === id) as (typeof categories)[number],
    ),
  };
}
function modelFor(
  key: string,
  model: string,
  reasoningEffort = "low",
  requestTimeout = 60000,
): DraftModel {
  if (!["none", "low", "medium", "high"].includes(reasoningEffort))
    throw new Error("Unsupported reasoning mode");
  const client = new ChatOpenAI({
    apiKey: key,
    model,
    temperature: 0.4,
    maxTokens: 4096,
    streaming: true,
    modelKwargs: { reasoning_effort: reasoningEffort },
    timeout: requestTimeout,
    maxRetries: 1,
    useResponsesApi: false,
    configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
  });
  return {
    async invoke(prompt) {
      const response = await client.invoke(prompt, {
        signal: AbortSignal.timeout(requestTimeout + 30000),
      });
      if (response.response_metadata?.finish_reason === "length")
        throw new Error("Incomplete response");
      if (typeof response.content !== "string") throw new Error("Expected text response");
      return response.content;
    },
  };
}
/** Private authoring only. This module is never imported by a client component. */
export async function draftContent(
  seed: string,
  env: Record<string, string | undefined> = process.env,
  injected?: DraftModel,
  includeGarden = false,
  includePack = false,
): Promise<DraftResult> {
  const fallback = (reason: DraftResult["reason"]): DraftResult => ({
    source: "deterministic",
    status: "review-required",
    reason,
    title: "A curious little collection",
    description: "Three familiar subjects, with room for an unexpected answer.",
    categories: dailyPrompts(seed),
  });
  if (env.FENGI_AI_ENABLED !== undefined && env.FENGI_AI_ENABLED !== "true")
    return fallback("disabled");
  if (!env.NVIDIA_API_KEY?.trim()) return fallback("missing-key");
  const modelName = env.NVIDIA_MODEL?.trim();
  if (!modelName) return fallback("missing-model");
  let stage: "provider-request" | "response-shape" | "schema-validation" = "provider-request";
  try {
    const timeout = Number(env.NVIDIA_REQUEST_TIMEOUT_MS || 60000);
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 180000)
      throw new Error("Invalid timeout setting");
    const model =
      injected ??
      modelFor(
        env.NVIDIA_API_KEY,
        modelName,
        env.NVIDIA_REASONING_EFFORT?.trim() || "low",
        timeout,
      );
    const output = await model.invoke(
      `Create an editorial draft for a friendly word game. Return only a JSON object with title (3-80 characters), description (5-240 characters), categoryIds (exactly three distinct IDs from this list): ${categories.map((c) => c.id).join(", ")}. Do not invent facts, answers, scores or IDs. Make the language welcoming and never claim player rarity. ${includePack ? "Also include pack:{signal:{solution:[25 binary 0/1 integers in row-major 5x5],clues:[4 to 10 distinct indices 0..24]},pairs:{deck:[16 integers, exactly two each of 0,1,2,3,4,5,6,7 in a shuffled memory-game order]},orbit:{targets:[4 to 8 distinct radians between 0.4 and 5.8],phases:[three distinct integers between 0 and 209],speed:1.5}}. Design a varied original logic-grid pattern, distributed memory pairs, and gentle timed orbit challenge. No prose inside pack or extra fields. Signal clue ambiguity is repaired by trusted code. Orbit uses existing bounded gates and 45-second duration." : ""} ${includeGarden ? "Also include garden:{walls:[integers],seeds:[integers]}. Design an original solvable 6x6 route puzzle, cells 0..35 row-major, start 0, exit 35. Exactly three distinct seed cells 1..34, four to twelve distinct walls 1..34, no overlap. All seeds and exit must be reachable from start using orthogonal moves. Do not include optimum or solution." : ""}`,
    );
    stage = "response-shape";
    if (output.length > 8000) throw new Error("Oversized response");
    // Accept one JSON code fence, but never extract JSON from surrounding prose.
    const json = output.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1");
    // Use the final parser, never its partial/streaming repair path.
    if (json.includes("```") || !json.startsWith("{") || !json.endsWith("}"))
      throw new Error("Expected JSON object");
    stage = "schema-validation";
    const validated = validateDraft(await new JsonOutputParser().parse(json));
    if (includePack && !validated.pack) throw new Error("Missing game pack");
    if (includeGarden && !validated.garden) throw new Error("Missing garden");
    return {
      source: "nvidia",
      status: "review-required",
      reason: "generated",
      title: validated.title,
      description: validated.description,
      categories: validated.categories,
      ...(validated.pack ? { pack: validated.pack } : {}),
      ...(validated.garden ? { garden: validated.garden } : {}),
    };
  } catch (error) {
    // Provider errors may contain credentials or request bodies. Never print them.
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number" &&
      error.status >= 100 &&
      error.status <= 599
        ? error.status
        : undefined;
    return {
      ...fallback("provider-or-validation-failure"),
      diagnostics: { stage, ...(status ? { status } : {}) },
    };
  }
}
