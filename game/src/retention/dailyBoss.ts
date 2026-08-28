import { STARTERS } from "../content/starters";
import { DeterministicAdapter } from "../craft/adapters/deterministic";
import { craftElement } from "../craft/pipeline";
import { createRng, fnv1a64, type Specimen } from "../engine";

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
    // Distinct battle identity per slot even if two slots fuse the same pair.
    squad.push({ ...child, id: `${child.id}-boss-${date}-${slot}` });
  }
  return squad;
}

/** Seed for the daily boss battle so replays of the same day are comparable. */
export function dailyBossSeed(date: string, playerId: string): bigint {
  return fnv1a64(`daily-boss-battle:v1:${date}:${playerId}`);
}
