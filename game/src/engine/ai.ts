import { type Action, type BattleState, legalActions, type Policy } from "./battle";
import type { Side } from "./log";
import { effectiveness } from "./types";

/**
 * Deterministic opponent policy (spec §4: no hidden randomness — the only
 * battle randomness lives in the battle rng). Scores each legal move by
 * expected damage contribution and picks the best; ties break on lowest
 * index; never switches voluntarily.
 */
export const aiPolicy: Policy = (state: BattleState, side: Side): Action => {
  const me = state.sides[side];
  const mine = me.squad[me.activeIndex];
  const other = state.sides[side === 0 ? 1 : 0];
  const target = other.squad[other.activeIndex];
  if (mine === undefined || target === undefined) throw new Error("invalid battle state");

  const actions = legalActions(state, side);
  let best: Action | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const action of actions) {
    let score: number;
    if (action.kind === "move") {
      const move = mine.specimen.moves[action.moveIndex];
      if (move.category === "status") {
        // A status move is worth a modest fixed value, once it still applies.
        const redundant =
          (move.effect === "burn" || move.effect === "poison") && target.status !== "none";
        score = redundant ? 5 : 45;
      } else {
        const eff = effectiveness(
          move.type,
          target.specimen.types.map((t) => t.archetype),
        );
        const stab = mine.specimen.types.some((t) => t.archetype === move.type) ? 1.5 : 1;
        score = move.power * eff * stab * (move.accuracy / 100);
      }
    } else if (action.kind === "struggle") {
      score = 10;
    } else {
      score = -1; // switching is a last resort for the baseline AI
    }
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  if (best === undefined) throw new Error("no legal action");
  return best;
};
