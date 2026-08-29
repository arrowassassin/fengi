import { deriveStats, hashToHex, type Specimen } from "../engine";
import { recipeHash } from "../registry/recipe";
import { DeterministicAdapter } from "./adapters/deterministic";
import type { CraftAdapter, CraftRequest } from "./adapters/types";
import { type CraftedElement, parseCrafted } from "./schema";

export type CraftProvenance = "llm" | "fallback";

export interface CraftResult {
  specimen: Specimen;
  flavor: string;
  provenance: CraftProvenance;
  recipeKeyHex: string;
}

const MAX_ATTEMPTS = 3; // 1 try + 2 bounded retries (spec §3)

function toSpecimen(crafted: CraftedElement, hash: bigint, generation: number): Specimen {
  return {
    id: `spec-${hashToHex(hash)}`,
    name: crafted.name,
    emoji: crafted.emoji,
    types: crafted.types,
    generation,
    recipeHash: hash,
    // Base stats are engine-derived, never LLM-chosen (spec §3).
    stats: deriveStats(hash, generation),
    moves: crafted.moves,
  };
}

/**
 * Craft a new element from two parents. Never throws and never fails: invalid
 * or unreachable adapters degrade to the deterministic fallback generator.
 */
export async function craftElement(
  parentA: Specimen,
  parentB: Specimen,
  adapter: CraftAdapter,
): Promise<CraftResult> {
  const hash = recipeHash(parentA.id, parentB.id);
  const generation = Math.max(parentA.generation, parentB.generation) + 1;
  const request: CraftRequest = {
    parentA: { name: parentA.name, emoji: parentA.emoji, types: parentA.types },
    parentB: { name: parentB.name, emoji: parentB.emoji, types: parentB.types },
    recipeHashHex: hashToHex(hash),
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await adapter.invent(request);
      const parsed = parseCrafted(raw);
      if (parsed.ok) {
        return {
          specimen: toSpecimen(parsed.value, hash, generation),
          flavor: parsed.value.flavor,
          provenance: "llm",
          recipeKeyHex: hashToHex(hash),
        };
      }
    } catch {
      // fall through to retry, then fallback
    }
  }

  const fallbackRaw = await new DeterministicAdapter().invent(request);
  const parsed = parseCrafted(fallbackRaw);
  if (!parsed.ok) {
    throw new Error(`deterministic fallback produced invalid output: ${parsed.error}`);
  }
  return {
    specimen: toSpecimen(parsed.value, hash, generation),
    flavor: parsed.value.flavor,
    provenance: "fallback",
    recipeKeyHex: hashToHex(hash),
  };
}
