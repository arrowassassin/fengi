import type { MoveEffect } from "./moves";

/**
 * Structured battle event log (spec §4). Everything the UI or the LLM
 * commentator shows derives from these events, after outcomes are decided.
 * Events are plain JSON data — stable serialization backs the determinism
 * property tests.
 */

export type Side = 0 | 1;

export type BattleEvent =
  | {
      kind: "battle-start";
      seed: string;
      squads: [readonly string[], readonly string[]];
    }
  | { kind: "turn-start"; turn: number }
  | { kind: "switch"; side: Side; name: string; squadIndex: number }
  | { kind: "move-used"; side: Side; name: string; move: string; struggle: boolean }
  | { kind: "move-missed"; side: Side; name: string; move: string }
  | {
      kind: "damage";
      side: Side; // side taking the damage
      name: string;
      amount: number;
      remainingHp: number;
      effectiveness: number;
      crit: boolean;
    }
  | { kind: "recoil"; side: Side; name: string; amount: number; remainingHp: number }
  | { kind: "status-applied"; side: Side; name: string; effect: MoveEffect }
  | { kind: "status-tick"; side: Side; name: string; effect: MoveEffect; amount: number }
  | { kind: "stun-skip"; side: Side; name: string }
  | { kind: "heal"; side: Side; name: string; amount: number; remainingHp: number }
  | { kind: "stage-change"; side: Side; name: string; stat: string; delta: number }
  | { kind: "faint"; side: Side; name: string }
  | { kind: "battle-end"; outcome: "side0" | "side1" | "draw"; turns: number };

export function serializeLog(log: readonly BattleEvent[]): string {
  return JSON.stringify(log);
}
