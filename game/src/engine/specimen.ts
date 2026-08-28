import type { Move } from "./moves";
import type { Stats } from "./stats";
import type { ElementType } from "./types";

/**
 * Invented type (approved design): the AI names types freely ("VAPOR",
 * "GOSSIP", "LAW"); each label maps deterministically onto one of the 12
 * mechanical archetypes so the battle chart stays total and reproducible.
 */
export interface InventedType {
  /** Display label, uppercase, as invented by the oracle. */
  label: string;
  /** Mechanical archetype backing the type chart. */
  archetype: ElementType;
}

export type TypePair = [InventedType] | [InventedType, InventedType];

export interface Specimen {
  id: string;
  name: string;
  emoji: string;
  types: TypePair;
  /** Fusion depth: 0 for primordial starters. */
  generation: number;
  /** Daily bosses render at tier 4 — the most elaborate burst (handoff 1f). */
  boss?: boolean;
  /** Canonical 64-bit recipe hash — seeds stats and badge art. */
  recipeHash: bigint;
  stats: Stats;
  /** Exactly 3 moves (approved design). */
  moves: [Move, Move, Move];
}

/** The archetypes a specimen fights with (STAB, defensive chart). */
export function archetypesOf(specimen: Specimen): ElementType[] {
  return specimen.types.map((t) => t.archetype);
}
