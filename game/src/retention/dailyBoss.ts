import { STARTERS } from "../content/starters";
import { DeterministicAdapter } from "../craft/adapters/deterministic";
import { craftElement } from "../craft/pipeline";
import { createRng, deriveStats, fnv1a64, type Specimen } from "../engine";

/**
 * Daily boss (spec §5): one boss squad per UTC day, derived deterministically
 * from the date — every player on Earth faces the same three fusions.
 */
export async function dailyBossSquad(date: string): Promise<Specimen[]> {
  const rng = createRng(fnv1a64(`daily-boss:v1:${date}`));
  const adapter = new DeterministicAdapter();
  const squad: Specimen[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const a = STARTERS[rng.int(STARTERS.length)];
    const b = STARTERS[rng.int(STARTERS.length)];
    if (a === undefined || b === undefined) throw new Error("starter pool empty");
    const child = (await craftElement(a, b, adapter)).specimen;
    // Bosses are tier-4 (handoff 1f: "most elaborate burst") with the
    // matching generation stat bonus; distinct id per slot and date.
    squad.push({
      ...child,
      id: `${child.id}-boss-${date}-${slot}`,
      boss: true,
      generation: 4,
      stats: deriveStats(child.recipeHash, 4),
    });
  }
  return squad;
}

/** Seed for the daily boss battle so replays of the same day are comparable. */
export function dailyBossSeed(date: string, playerId: string): bigint {
  return fnv1a64(`daily-boss-battle:v1:${date}:${playerId}`);
}
