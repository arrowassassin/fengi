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

/**
 * Deterministic label → archetype mapping (approved design: types are
 * freeform invented labels; mechanics need a total chart). Keyword families
 * catch thematically obvious labels; everything else hashes onto the chart
 * uniformly — same label maps to the same archetype on every device.
 */
const ARCHETYPE_KEYWORDS: [RegExp, ElementType][] = [
  [/FIRE|FLAME|EMBER|LAVA|BURN|SCORCH|HEAT|CHAOS/u, "fire"],
  [/WATER|VAPOR|WAVE|RAIN|SEA|TIDE|GOO|PRESSURE|STEAM|MIST/u, "water"],
  [/EARTH|STONE|ROCK|GRIT|MUD|SAND|BRICK|QUAKE/u, "earth"],
  [/AIR|WIND|GALE|SKY|BREEZE|STORM|CLOUD/u, "air"],
  [/METAL|STEEL|IRON|CHROME|GEAR|BLADE/u, "metal"],
  [/WOOD|PLANT|LEAF|ROOT|BLOOM|VINE|PAPER/u, "wood"],
  [/VOLT|ZAP|SPARK|THUNDER|LIGHTNING|SHOCK|STATIC/u, "lightning"],
  [/ICE|FROST|SNOW|FREEZE|RIME|COLD/u, "ice"],
  [/VENOM|TOXIN|POISON|ACID|SNAKE|VILE/u, "venom"],
  [/LIGHT|SUN|DAWN|GLOW|BEAM|HALO/u, "light"],
  [/SHADOW|DARK|DUSK|NIGHT|GHOST|GRUDGE|VOID/u, "shadow"],
  [/ARCANE|MAGIC|RUNE|IDEA|MIND|LAW|GOSSIP|SIGN|DREAM/u, "arcane"],
];

export function archetypeForLabel(label: string): ElementType {
  const upper = label.toUpperCase();
  for (const [pattern, archetype] of ARCHETYPE_KEYWORDS) {
    if (pattern.test(upper)) return archetype;
  }
  // FNV-1a-32 style fold onto the chart — stable everywhere.
  let h = 0x811c9dc5;
  for (let i = 0; i < upper.length; i++) {
    h = Math.imul(h ^ upper.charCodeAt(i), 0x01000193) >>> 0;
  }
  const archetype = TYPES[h % TYPES.length];
  if (archetype === undefined) throw new Error("empty type chart");
  return archetype;
}

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
