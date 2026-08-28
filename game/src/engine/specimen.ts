import type { Move } from "./moves";
import type { Stats } from "./stats";
import type { ElementType } from "./types";

export type TypePair = [ElementType] | [ElementType, ElementType];

export interface Specimen {
  id: string;
  name: string;
  emoji: string;
  types: TypePair;
  /** Fusion depth: 0 for primordial starters. */
  generation: number;
  /** Canonical 64-bit recipe hash — seeds stats and sigil art. */
  recipeHash: bigint;
  stats: Stats;
  moves: [Move, Move, Move, Move];
}
