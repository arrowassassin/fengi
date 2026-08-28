import { splitmix64 } from "./hash";

export const STAT_KEYS = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export function statTotal(stats: Stats): number {
  return STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
}

const FLOORS: Stats = { hp: 50, attack: 30, defense: 30, spAttack: 30, spDefense: 30, speed: 30 };
const FLOOR_TOTAL = statTotal(FLOORS);

/**
 * Base stats are engine-derived from the 64-bit recipe hash — never
 * LLM-chosen (spec §3). Bounded budget: 430–480 from the hash, plus a small
 * monotonic generation bonus (≤60), keeping totals within [400, 560].
 */
export function deriveStats(recipeHash: bigint, generation: number): Stats {
  let sm = splitmix64(recipeHash ^ 0x5747a75f5ba15fadn);
  const draw = (): number => {
    sm = splitmix64(sm.next);
    return Number(sm.value & 0xffffffffn) / 4294967296;
  };

  const budget = 430 + Math.floor(draw() * 51); // 430..480
  const bonus = Math.min(Math.max(generation, 0), 10) * 6;
  const total = budget + bonus;

  const weights = STAT_KEYS.map(() => 1 + draw()); // each in [1, 2)
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const spendable = total - FLOOR_TOTAL;
  const stats: Stats = { ...FLOORS };
  let allocated = 0;
  STAT_KEYS.forEach((key, i) => {
    const share = Math.floor((spendable * (weights[i] ?? 1)) / weightSum);
    stats[key] += share;
    allocated += share;
  });
  // Distribute rounding leftovers in fixed stat order for determinism.
  let leftover = spendable - allocated;
  for (let i = 0; leftover > 0; i = (i + 1) % STAT_KEYS.length) {
    const key = STAT_KEYS[i];
    if (key !== undefined) {
      stats[key] += 1;
      leftover -= 1;
    }
  }
  return stats;
}
