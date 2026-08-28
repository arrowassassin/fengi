import {
  createRng,
  type ElementType,
  fnv1a64,
  type MoveCategory,
  type MoveEffect,
} from "../../engine";
import type { CraftAdapter, CraftRequest } from "./types";

/**
 * Seeded generator producing always-valid fusion JSON (spec §3 fallback:
 * crafting never fails). Same recipe hash → same invention on every device.
 */

const PREFIXES: Record<ElementType, string[]> = {
  fire: ["Molten", "Ember", "Cinder", "Pyric"],
  water: ["Tidal", "Brine", "Misted", "Abyssal"],
  earth: ["Terra", "Basalt", "Loam", "Quarried"],
  air: ["Zephyr", "Gale", "Hollow", "Sky"],
  metal: ["Gilded", "Ferric", "Chrome", "Anvil"],
  wood: ["Verdant", "Briar", "Rooted", "Sylvan"],
  lightning: ["Volt", "Storm", "Arc", "Ion"],
  ice: ["Glacial", "Rime", "Frost", "Boreal"],
  venom: ["Toxic", "Vile", "Serpent", "Miasmic"],
  light: ["Radiant", "Dawn", "Halo", "Lucent"],
  shadow: ["Umbral", "Dusk", "Veiled", "Nocturne"],
  arcane: ["Runic", "Occult", "Sigil", "Aether"],
};

const NOUNS: Record<ElementType, string[]> = {
  fire: ["Salamander", "Forge", "Wyrm", "Phoenix"],
  water: ["Leviathan", "Naiad", "Kraken", "Undine"],
  earth: ["Golem", "Tortoise", "Colossus", "Barrow"],
  air: ["Djinn", "Harrier", "Wisp", "Roc"],
  metal: ["Automaton", "Juggernaut", "Blade", "Sentinel"],
  wood: ["Fern", "Treant", "Willow", "Bramble"],
  lightning: ["Raiju", "Dynamo", "Herald", "Spark"],
  ice: ["Wendigo", "Shard", "Aurora", "Yeti"],
  venom: ["Basilisk", "Widow", "Chimera", "Asp"],
  light: ["Seraph", "Lantern", "Oracle", "Beacon"],
  shadow: ["Shade", "Revenant", "Moth", "Wraith"],
  arcane: ["Homunculus", "Grimoire", "Sphinx", "Cipher"],
};

const MOVE_VERBS = ["Lash", "Surge", "Brand", "Coil", "Howl", "Rend", "Bloom", "Pulse"];
const EMOJI_BANK: Record<ElementType, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🪨",
  air: "🌪️",
  metal: "⚙️",
  wood: "🌿",
  lightning: "⚡",
  ice: "❄️",
  venom: "🐍",
  light: "✨",
  shadow: "🌑",
  arcane: "🔮",
};

const EFFECT_POOL: MoveEffect[] = [
  "burn",
  "poison",
  "stun",
  "shield",
  "drain",
  "heal",
  "buff-attack",
  "buff-defense",
  "buff-speed",
  "debuff-attack",
  "debuff-defense",
  "debuff-speed",
];

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error("empty pick pool");
  return item;
}

export class DeterministicAdapter implements CraftAdapter {
  readonly name = "deterministic";

  invent(request: CraftRequest): Promise<string> {
    const rng = createRng(fnv1a64(`craft-fallback:${request.recipeHashHex}`));
    // Sorted pool: the invention must not depend on parent argument order.
    const pool: ElementType[] = [...request.parentA.types, ...request.parentB.types].sort();
    const primary = pick(pool, rng.int(pool.length));
    const others = pool.filter((t) => t !== primary);
    const secondary =
      others.length > 0 && rng.chance(70) ? pick(others, rng.int(others.length)) : undefined;
    const types: ElementType[] = secondary === undefined ? [primary] : [primary, secondary];

    const name = `${pick(PREFIXES[primary], rng.int(4))} ${pick(NOUNS[secondary ?? primary], rng.int(4))}`;
    const emoji = EMOJI_BANK[primary];

    const moves = Array.from({ length: 4 }, (_, i) => {
      const moveType = pick(types, rng.int(types.length));
      const category: MoveCategory =
        i === 3 && rng.chance(60) ? "status" : rng.chance(50) ? "physical" : "special";
      const isStatus = category === "status";
      const effect: MoveEffect = isStatus
        ? pick(EFFECT_POOL, rng.int(EFFECT_POOL.length))
        : rng.chance(40)
          ? pick(EFFECT_POOL, rng.int(EFFECT_POOL.length))
          : "none";
      return {
        name: `${pick(PREFIXES[moveType], rng.int(4))} ${pick(MOVE_VERBS, rng.int(MOVE_VERBS.length))}`,
        type: moveType,
        category,
        power: isStatus ? 0 : 40 + rng.int(9) * 10,
        accuracy: 80 + rng.int(21),
        pp: 5 + rng.int(4) * 5,
        effect,
        effectChance: effect === "none" ? 0 : isStatus ? 100 : 10 + rng.int(4) * 10,
      };
    });

    const [firstParent, secondParent] = [request.parentA.name, request.parentB.name].sort();
    const flavor = `Fused from ${firstParent} and ${secondParent} on the workbench.`;
    return Promise.resolve(JSON.stringify({ name, emoji, types, moves, flavor }));
  }
}
