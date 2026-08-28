import fc from "fast-check";
import type { Action, BattleState } from "./battle";
import { legalActions } from "./battle";
import { EFFECTS, type Move, type MoveCategory } from "./moves";
import type { Specimen } from "./specimen";
import { deriveStats } from "./stats";
import { TYPES } from "./types";

const arbCategory: fc.Arbitrary<MoveCategory> = fc.constantFrom("physical", "special", "status");

export const arbMove: fc.Arbitrary<Move> = fc
  .record({
    name: fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,15}$/),
    type: fc.constantFrom(...TYPES),
    category: arbCategory,
    power: fc.integer({ min: 20, max: 120 }),
    accuracy: fc.integer({ min: 50, max: 100 }),
    pp: fc.integer({ min: 5, max: 30 }),
    effect: fc.constantFrom(...EFFECTS),
    effectChance: fc.integer({ min: 0, max: 100 }),
  })
  .map((m) => (m.category === "status" ? { ...m, power: 0, effectChance: 100 } : m));

export const arbSpecimen: fc.Arbitrary<Specimen> = fc
  .record({
    name: fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,20}$/),
    emoji: fc.constantFrom("🔥", "💧", "🌿", "🪨", "⚡", "🌪️", "🧪", "✨"),
    types: fc.uniqueArray(fc.constantFrom(...TYPES), { minLength: 1, maxLength: 2 }),
    hash: fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }),
    generation: fc.integer({ min: 0, max: 6 }),
    moves: fc.tuple(arbMove, arbMove, arbMove, arbMove),
  })
  .map(({ name, emoji, types, hash, generation, moves }) => ({
    id: `spec-${hash.toString(16)}`,
    name,
    emoji,
    types: types as Specimen["types"],
    generation,
    recipeHash: hash,
    stats: deriveStats(hash, generation),
    moves,
  }));

export const arbSquad: fc.Arbitrary<Specimen[]> = fc
  .tuple(arbSpecimen, arbSpecimen, arbSpecimen)
  .map((t) => [...t]);

/** Deterministic scripted policy: consumes ints, maps each onto the legal action list. */
export function scriptedPolicy(
  script: readonly number[],
): (state: BattleState, side: 0 | 1) => Action {
  let cursor = 0;
  return (state, side) => {
    const legal = legalActions(state, side);
    const pick = script.length > 0 ? (script[cursor++ % script.length] ?? 0) : 0;
    const action = legal[Math.abs(pick) % legal.length];
    if (action === undefined) throw new Error("no legal action");
    return action;
  };
}

export const arbScript: fc.Arbitrary<number[]> = fc.array(fc.integer({ min: 0, max: 1000 }), {
  minLength: 1,
  maxLength: 64,
});
