import { deriveStats, fnv1a64, type Move, type Specimen } from "../engine";

/** The eight primordial specimens every player starts with (generation 0). */

function m(
  name: string,
  type: Move["type"],
  category: Move["category"],
  power: number,
  accuracy: number,
  pp: number,
  effect: Move["effect"] = "none",
  effectChance = 0,
): Move {
  return { name, type, category, power, accuracy, pp, effect, effectChance };
}

function starter(
  id: string,
  name: string,
  emoji: string,
  types: Specimen["types"],
  moves: [Move, Move, Move, Move],
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
    "starter-flame",
    "Primal Flame",
    "🔥",
    ["fire"],
    [
      m("Ember Lash", "fire", "physical", 60, 95, 20, "burn", 15),
      m("Cinder Pulse", "fire", "special", 70, 90, 15),
      m("Ashen Veil", "fire", "status", 0, 100, 10, "debuff-attack", 100),
      m("Scorch", "fire", "physical", 45, 100, 25),
    ],
  ),
  starter(
    "starter-tide",
    "Primal Tide",
    "💧",
    ["water"],
    [
      m("Brine Surge", "water", "special", 65, 95, 20),
      m("Undertow", "water", "physical", 55, 100, 20),
      m("Mist Shroud", "water", "status", 0, 100, 10, "shield", 100),
      m("Ripple Coil", "water", "special", 45, 100, 25, "drain", 100),
    ],
  ),
  starter(
    "starter-stone",
    "Primal Stone",
    "🪨",
    ["earth"],
    [
      m("Basalt Slam", "earth", "physical", 75, 90, 15),
      m("Quake Pulse", "earth", "special", 60, 95, 15),
      m("Barrow Wall", "earth", "status", 0, 100, 10, "buff-defense", 100),
      m("Pebble Rend", "earth", "physical", 40, 100, 30),
    ],
  ),
  starter(
    "starter-gale",
    "Primal Gale",
    "🌪️",
    ["air"],
    [
      m("Zephyr Cut", "air", "physical", 55, 100, 25),
      m("Sky Howl", "air", "special", 65, 95, 15),
      m("Tail Wind", "air", "status", 0, 100, 10, "buff-speed", 100),
      m("Gust Brand", "air", "special", 45, 100, 25, "debuff-speed", 30),
    ],
  ),
  starter(
    "starter-anvil",
    "Primal Anvil",
    "⚙️",
    ["metal"],
    [
      m("Chrome Rend", "metal", "physical", 70, 90, 15),
      m("Shard Volley", "metal", "special", 55, 95, 20),
      m("Temper", "metal", "status", 0, 100, 10, "buff-attack", 100),
      m("Anvil Drop", "metal", "physical", 85, 80, 10),
    ],
  ),
  starter(
    "starter-briar",
    "Primal Briar",
    "🌿",
    ["wood"],
    [
      m("Briar Lash", "wood", "physical", 60, 95, 20, "poison", 15),
      m("Sap Drain", "wood", "special", 50, 100, 20, "drain", 100),
      m("Rootbind", "wood", "status", 0, 90, 10, "stun", 100),
      m("Bloom Pulse", "wood", "special", 65, 90, 15),
    ],
  ),
  starter(
    "starter-storm",
    "Primal Storm",
    "⚡",
    ["lightning"],
    [
      m("Arc Bite", "lightning", "physical", 60, 95, 20, "stun", 10),
      m("Ion Burst", "lightning", "special", 75, 85, 15),
      m("Static Field", "lightning", "status", 0, 100, 10, "debuff-speed", 100),
      m("Spark Rend", "lightning", "physical", 45, 100, 25),
    ],
  ),
  starter(
    "starter-rime",
    "Primal Rime",
    "❄️",
    ["ice"],
    [
      m("Rime Shard", "ice", "special", 65, 95, 15),
      m("Glacial Ram", "ice", "physical", 60, 90, 15),
      m("Hoarfrost", "ice", "status", 0, 100, 10, "debuff-defense", 100),
      m("Boreal Coil", "ice", "special", 45, 100, 25),
    ],
  ),
];
