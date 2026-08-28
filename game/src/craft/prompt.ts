import { EFFECTS, TYPES } from "../engine";
import type { CraftRequest } from "./adapters/types";

export const CRAFT_SYSTEM_PROMPT = `You are the fusion oracle of Alchemy Arena. Two specimens are fused; you invent the result.
Respond with ONLY a JSON object, no prose, matching exactly:
{
  "name": string (2-40 chars, evocative, not a verbatim parent name),
  "emoji": string (a single emoji),
  "types": array of 1-2 strings from: ${TYPES.join(", ")},
  "moves": array of EXACTLY 4 objects:
    { "name": string, "type": one of the types list, "category": "physical"|"special"|"status",
      "power": integer 10-150 (0 only for status), "accuracy": integer 30-100,
      "pp": integer 1-40, "effect": one of: ${EFFECTS.join(", ")}, "effectChance": integer 0-100 },
  "flavor": string (max 140 chars)
}
Types and moves should thematically blend both parents.`;

export function craftUserPrompt(req: CraftRequest): string {
  const p = (x: CraftRequest["parentA"]): string => `${x.name} ${x.emoji} [${x.types.join("/")}]`;
  return `Fuse: ${p(req.parentA)} + ${p(req.parentB)}. Output the JSON now.`;
}
