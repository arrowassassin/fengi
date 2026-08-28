import { deriveStats, fnv1a64, type Move, type Specimen } from "../engine";

/**
 * The four primordials (approved design 1e: "EVERYTHING TRACES BACK TO
 * FIRE · WATER · EARTH · AIR"). Generation 0, exactly 3 moves each.
 */

function m(
  name: string,
  type: Move["type"],
  typeLabel: string,
  category: Move["category"],
  power: number,
  accuracy: number,
  pp: number,
  effect: Move["effect"] = "none",
  effectChance = 0,
): Move {
  return { name, type, typeLabel, category, power, accuracy, pp, effect, effectChance };
}

function starter(
  id: string,
  name: string,
  emoji: string,
  types: Specimen["types"],
  moves: [Move, Move, Move],
): Specimen {
  const recipeHash = fnv1a64(`starter:v1:${id}`);
  return {
    id,
    name,
    emoji,
    types,
    generation: 0,
    recipeHash,
    stats: deriveStats(recipeHash, 0),
    moves,
  };
}

export const STARTERS: Specimen[] = [
  starter(
    "starter-fire",
    "FIRE",
    "🔥",
    [{ label: "FIRE", archetype: "fire" }],
    [
      m("EMBER LASH", "fire", "FIRE", "physical", 60, 95, 20, "burn", 15),
      m("SCORCH", "fire", "FIRE", "special", 70, 90, 15),
      m("ASHEN VEIL", "fire", "FIRE", "status", 0, 100, 10, "debuff-attack", 100),
    ],
  ),
  starter(
    "starter-water",
    "WATER",
    "💧",
    [{ label: "WATER", archetype: "water" }],
    [
      m("DOUSE", "water", "WATER", "special", 65, 95, 20),
      m("UNDERTOW", "water", "WATER", "physical", 55, 100, 20),
      m("MIST SHROUD", "water", "WATER", "status", 0, 100, 10, "shield", 100),
    ],
  ),
  starter(
    "starter-earth",
    "EARTH",
    "🪨",
    [{ label: "EARTH", archetype: "earth" }],
    [
      m("BASALT SLAM", "earth", "EARTH", "physical", 75, 90, 15),
      m("QUAKE PULSE", "earth", "EARTH", "special", 60, 95, 15),
      m("BARROW WALL", "earth", "EARTH", "status", 0, 100, 10, "buff-defense", 100),
    ],
  ),
  starter(
    "starter-air",
    "AIR",
    "💨",
    [{ label: "AIR", archetype: "air" }],
    [
      m("ZEPHYR CUT", "air", "AIR", "physical", 55, 100, 25),
      m("SKY HOWL", "air", "AIR", "special", 65, 95, 15),
      m("TAIL WIND", "air", "AIR", "status", 0, 100, 10, "buff-speed", 100),
    ],
  ),
];
