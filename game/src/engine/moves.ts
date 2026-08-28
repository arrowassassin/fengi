import type { ElementType } from "./types";

export const CATEGORIES = ["physical", "special", "status"] as const;
export type MoveCategory = (typeof CATEGORIES)[number];

/** Closed effect vocabulary (spec §3) — the LLM may only pick from these. */
export const EFFECTS = [
  "none",
  "burn",
  "poison",
  "stun",
  "shield",
  "drain",
  "heal",
  "buff-attack",
  "buff-defense",
  "buff-speed",
  "debuff-attack",
  "debuff-defense",
  "debuff-speed",
] as const;
export type MoveEffect = (typeof EFFECTS)[number];

export interface Move {
  name: string;
  /** Mechanical archetype (drives the chart, STAB, weekly modifiers). */
  type: ElementType;
  /** Display label as invented by the oracle (e.g. "ZAP", "PRESSURE"). */
  typeLabel: string;
  category: MoveCategory;
  /** 0 for pure status moves. */
  power: number;
  /** Percent, 1–100. */
  accuracy: number;
  pp: number;
  effect: MoveEffect;
  /** Percent chance the effect triggers on hit. */
  effectChance: number;
}

/**
 * Fallback attack when a combatant has exhausted every move's PP. Typeless in
 * effect: the engine skips STAB and type effectiveness for it, and the user
 * takes 1/4 of dealt damage as recoil.
 */
export const STRUGGLE: Move = {
  name: "Exhausted Strike",
  typeLabel: "EXHAUSTED",
  type: "arcane",
  category: "physical",
  power: 40,
  accuracy: 100,
  pp: 0,
  effect: "none",
  effectChance: 0,
};
