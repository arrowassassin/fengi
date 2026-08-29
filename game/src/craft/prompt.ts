import { EFFECTS } from "../engine";
import type { CraftRequest } from "./adapters/types";

export const CRAFT_SYSTEM_PROMPT = `You are the fusion oracle of Alchemy Arena. Two elements are fused; you invent the result.
Respond with ONLY a JSON object, no prose, matching exactly:
{
  "name": string (2-40 chars, punchy and evocative, UPPERCASE, not a verbatim parent name),
  "emoji": string (a single emoji),
  "types": array of 1-2 INVENTED type labels you make up (2-16 chars, uppercase, e.g. "VAPOR", "PRESSURE", "GOSSIP", "LAW"),
  "moves": array of EXACTLY 3 objects:
    { "name": string (UPPERCASE, witty), "type": one of your invented type labels,
      "category": "physical"|"special"|"status",
      "power": integer 10-150 (0 only for status), "accuracy": integer 30-100,
      "pp": integer 1-40, "effect": one of: ${EFFECTS.join(", ")}, "effectChance": integer 0-100 },
  "flavor": string (max 140 chars, deadpan comedy)
}
The result should thematically blend both parents with personality.`;

export function craftUserPrompt(req: CraftRequest): string {
  const p = (x: CraftRequest["parentA"]): string =>
    `${x.name} ${x.emoji} [${x.types.map((t) => t.label).join("/")}]`;
  return `Fuse: ${p(req.parentA)} + ${p(req.parentB)}. Output the JSON now.`;
}
