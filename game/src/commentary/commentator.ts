import type { BattleEvent } from "../engine";

/**
 * Battle commentator (spec §4): turns decided log events into color text
 * strictly after the fact. The default implementation is local templates; an
 * LLM commentator can be layered on the same interface later — either way a
 * commentary failure never blocks or alters a battle.
 */

export type Commentator = (event: BattleEvent) => string | undefined;

export const templateCommentator: Commentator = (event) => {
  switch (event.kind) {
    case "battle-start":
      return "The seals are drawn. Three against three.";
    case "damage":
      if (event.crit) return `A vicious opening in ${event.name}'s guard!`;
      if (event.effectiveness > 1) return "The elements themselves recoil — devastating.";
      if (event.effectiveness === 0) return "The strike passes through harmlessly.";
      if (event.effectiveness < 1) return "Barely a scratch on that seal.";
      return undefined;
    case "move-missed":
      return `${event.name} swings wide.`;
    case "status-applied":
      return event.effect === "burn"
        ? `${event.name} smolders at the edges.`
        : event.effect === "poison"
          ? `Venom seeps into ${event.name}'s sigil.`
          : undefined;
    case "faint":
      return `${event.name}'s seal cracks and goes dark.`;
    case "battle-end":
      return event.outcome === "draw"
        ? "Both benches lie silent. The arena calls it even."
        : `It is decided in ${event.turns} turns.`;
    default:
      return undefined;
  }
};

/** Safe wrapper: any commentator error degrades to silence, never a crash. */
export function commentate(commentator: Commentator, event: BattleEvent): string | undefined {
  try {
    return commentator(event);
  } catch {
    return undefined;
  }
}
