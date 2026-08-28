import { type BattleConfig, createRng, fnv1a64 } from "../engine";

/**
 * Weekly modifier (spec §5): one arena-wide rule per ISO week, applied as
 * engine *config* — never an engine patch — so determinism is preserved.
 */

export interface WeeklyModifier {
  id: string;
  name: string;
  description: string;
  config: BattleConfig;
}

const MODIFIERS: WeeklyModifier[] = [
  {
    id: "acid-rain",
    name: "Acid Rain",
    description: "Water moves hit 20% harder.",
    config: { typeDamageMultipliers: { water: 1.2 } },
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    description: "Fire and light moves hit 15% harder.",
    config: { typeDamageMultipliers: { fire: 1.15, light: 1.15 } },
  },
  {
    id: "long-night",
    name: "The Long Night",
    description: "Shadow moves hit 25% harder; light moves 10% softer.",
    config: { typeDamageMultipliers: { shadow: 1.25, light: 0.9 } },
  },
  {
    id: "magnet-storm",
    name: "Magnet Storm",
    description: "Metal and lightning moves hit 15% harder.",
    config: { typeDamageMultipliers: { metal: 1.15, lightning: 1.15 } },
  },
  {
    id: "deep-frost",
    name: "Deep Frost",
    description: "Ice moves hit 20% harder; fire moves 10% softer.",
    config: { typeDamageMultipliers: { ice: 1.2, fire: 0.9 } },
  },
  {
    id: "overgrowth",
    name: "Overgrowth",
    description: "Wood and earth moves hit 15% harder.",
    config: { typeDamageMultipliers: { wood: 1.15, earth: 1.15 } },
  },
];

/** ISO-8601 week identity, e.g. "2026-W35". */
export function isoWeekOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // nearest Thursday
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weeklyModifierFor(date: Date): WeeklyModifier {
  const week = isoWeekOf(date);
  const rng = createRng(fnv1a64(`weekly-modifier:v1:${week}`));
  const modifier = MODIFIERS[rng.int(MODIFIERS.length)];
  if (modifier === undefined) throw new Error("modifier table empty");
  return modifier;
}
