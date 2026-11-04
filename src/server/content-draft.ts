import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { categories } from "../games/odd/content";
import { dailyPrompts } from "../games/odd/engine";

const draftSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(5).max(240),
    categoryIds: z.array(z.string()).length(3),
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
};
export type DraftModel = { invoke: (prompt: string) => Promise<string> };
export function validateDraft(value: unknown) {
  const draft = draftSchema.parse(value);
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
function modelFor(key: string, model: string): DraftModel {
  const client = new ChatOpenAI({
    apiKey: key,
    model,
    temperature: 0.4,
    maxTokens: 500,
    timeout: 15000,
    maxRetries: 1,
    useResponsesApi: false,
    configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
  });
  return {
    async invoke(prompt) {
      const response = await client.invoke(prompt, { signal: AbortSignal.timeout(20000) });
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
  try {
    const model = injected ?? modelFor(env.NVIDIA_API_KEY, modelName);
    const output = await model.invoke(
      `Create an editorial draft for a friendly word game. Return only a JSON object with title (3-80 characters), description (5-240 characters), categoryIds (exactly three distinct IDs from this list): ${categories.map((c) => c.id).join(", ")}. Do not invent facts, answers, scores or IDs. Make the language welcoming and never claim player rarity.`,
    );
    if (output.length > 8000) throw new Error("Oversized response");
    const validated = validateDraft(JSON.parse(output));
    return {
      source: "nvidia",
      status: "review-required",
      reason: "generated",
      title: validated.title,
      description: validated.description,
      categories: validated.categories,
    };
  } catch {
    // Provider errors may contain credentials or request bodies. Never print them.
    return fallback("provider-or-validation-failure");
  }
}
