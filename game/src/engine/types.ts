/** Element type chart (spec §4). 12 types; multipliers 0 / 0.5 / 1 / 2. */

export const TYPES = [
  "fire",
  "water",
  "earth",
  "air",
  "metal",
  "wood",
  "lightning",
  "ice",
  "venom",
  "light",
  "shadow",
  "arcane",
] as const;

export type ElementType = (typeof TYPES)[number];

export function isElementType(value: string): value is ElementType {
  return (TYPES as readonly string[]).includes(value);
}

interface Matchups {
  strong: readonly ElementType[];
  weak: readonly ElementType[];
  immune?: readonly ElementType[];
}

const CHART: Record<ElementType, Matchups> = {
  fire: { strong: ["wood", "ice", "metal"], weak: ["water", "earth", "fire"] },
  water: { strong: ["fire", "earth"], weak: ["wood", "water"] },
  earth: { strong: ["lightning", "fire", "metal"], weak: ["wood", "earth"], immune: ["air"] },
  air: { strong: ["venom", "wood"], weak: ["metal", "lightning", "air"] },
  metal: { strong: ["ice", "wood", "arcane"], weak: ["fire", "metal", "lightning"] },
  wood: { strong: ["water", "earth"], weak: ["fire", "metal", "wood", "venom"] },
  lightning: { strong: ["water", "air"], weak: ["wood", "lightning"], immune: ["earth"] },
  ice: { strong: ["wood", "earth", "air"], weak: ["fire", "metal", "ice", "water"] },
  venom: { strong: ["wood", "water", "light"], weak: ["metal", "earth", "venom"] },
  light: { strong: ["shadow", "venom"], weak: ["metal", "light"] },
  shadow: { strong: ["light", "arcane"], weak: ["shadow"] },
  arcane: { strong: ["shadow", "lightning", "ice"], weak: ["metal", "arcane"] },
};

export function effectivenessAgainstOne(attack: ElementType, defend: ElementType): number {
  const row = CHART[attack];
  if (row.immune?.includes(defend)) return 0;
  if (row.strong.includes(defend)) return 2;
  if (row.weak.includes(defend)) return 0.5;
  return 1;
}

/** Combined multiplier against a mono- or dual-typed defender. */
export function effectiveness(attack: ElementType, defend: readonly ElementType[]): number {
  return defend.reduce((mul, t) => mul * effectivenessAgainstOne(attack, t), 1);
}
