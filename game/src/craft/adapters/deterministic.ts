import { createRng, type ElementType, fnv1a64, type MoveEffect } from "../../engine";
import type { CraftAdapter, CraftRequest } from "./types";

/**
 * Seeded generator producing always-valid fusion JSON (spec §3 fallback:
 * crafting never fails). Same recipe hash → same invention on every device.
 * Register follows the approved design's fusion table: UPPERCASE punchy
 * names, invented type labels ("VAPOR", "PRESSURE"), 3 witty moves.
 */

const NAME_FIRST: Record<ElementType, string[]> = {
  fire: ["MOLTEN", "SMUG", "FERAL", "ARTISANAL"],
  water: ["DRIP", "ABYSSAL", "LUKEWARM", "PASSIVE-AGGRESSIVE"],
  earth: ["LOAD-BEARING", "BASALT", "OVERPRICED", "PRIMORDIAL"],
  air: ["INVISIBLE", "GUSTY", "UNSOLICITED", "HOLLOW"],
  metal: ["CHROME", "UNIONIZED", "GILDED", "INDUSTRIAL"],
  wood: ["ORGANIC", "BANNED", "OVERGROWN", "HEIRLOOM"],
  lightning: ["BOTTLED", "GRUDGE", "STATIC", "OVERCLOCKED"],
  ice: ["GLACIAL", "SARCASTIC", "BRITTLE", "FROSTBITTEN"],
  venom: ["SALTY", "SPITEFUL", "CURSED", "EXPIRED"],
  light: ["RADIANT", "SMUG", "GOVERNMENT", "GLOWING"],
  shadow: ["HAUNTED", "UNPAID", "MIDNIGHT", "REDACTED"],
  arcane: ["FORBIDDEN", "BUREAUCRATIC", "THEORETICAL", "ANCIENT"],
};

const NAME_SECOND: Record<ElementType, string[]> = {
  fire: ["INFERNO", "BARBECUE", "TANTRUM", "FURNACE"],
  water: ["MONSOON", "PUDDLE", "GEYSER", "BROTH"],
  earth: ["LANDLORD", "BOULDER", "CASSEROLE", "MONUMENT"],
  air: ["FORECAST", "SIGH", "TORNADO", "RUMOR"],
  metal: ["JUGGERNAUT", "PAPERCLIP", "GUILLOTINE", "VENDING MACHINE"],
  wood: ["BRAMBLE", "PAPERWORK", "TREEHOUSE", "SPLINTER"],
  lightning: ["THUNDER", "OUTAGE", "JOLT", "GENERATOR"],
  ice: ["BLIZZARD", "FREEZER BURN", "GLACIER", "SLUSHIE"],
  venom: ["GOSSIP", "LAWSUIT", "SERPENT", "LEFTOVERS"],
  light: ["AUDIT", "HALO", "SPOTLIGHT", "SUNRISE"],
  shadow: ["GRUDGE", "OVERDRAFT", "PHANTOM", "MONDAY"],
  arcane: ["PROPHECY", "FINE PRINT", "HOMEWORK", "RITUAL"],
};

/** Labels chosen so archetypeForLabel maps each back to its own archetype. */
const TYPE_LABELS: Record<ElementType, string[]> = {
  fire: ["FIRE", "CHAOS", "HEAT", "SCORCH"],
  water: ["WATER", "VAPOR", "PRESSURE", "GOO"],
  earth: ["EARTH", "STONE", "GRIT", "QUAKE"],
  air: ["AIR", "WIND", "BREEZE", "GALE"],
  metal: ["STEEL", "CHROME", "GEAR", "IRON"],
  wood: ["WOOD", "PAPER", "ROOT", "VINE"],
  lightning: ["VOLT", "ZAP", "STATIC", "SHOCK"],
  ice: ["ICE", "FROST", "SNOW", "RIME"],
  venom: ["VENOM", "ACID", "TOXIN", "POISON"],
  light: ["LIGHT", "GLOW", "SUN", "BEAM"],
  shadow: ["SHADOW", "DUSK", "VOID", "NIGHT"],
  arcane: ["ARCANE", "IDEA", "GOSSIP", "LAW"],
};

const MOVE_VERBS = ["SLAM", "CAMPAIGN", "SNAP", "AUDIT", "TANTRUM", "COIL", "BYLAW", "ERUPTION"];

const EMOJI_BANK: Record<ElementType, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🪨",
  air: "💨",
  metal: "⚙",
  wood: "🌿",
  lightning: "⚡",
  ice: "❄",
  venom: "🐍",
  light: "☀",
  shadow: "👻",
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
    // Sorted archetype pool: invention must not depend on parent order.
    const pool = [...request.parentA.types, ...request.parentB.types]
      .map((t) => t.archetype)
      .sort();
    const primary = pick(pool, rng.int(pool.length));
    const others = pool.filter((t) => t !== primary);
    const secondary =
      others.length > 0 && rng.chance(70) ? pick(others, rng.int(others.length)) : undefined;

    const typeLabels = [pick(TYPE_LABELS[primary], rng.int(4))];
    if (secondary !== undefined) {
      const label = pick(TYPE_LABELS[secondary], rng.int(4));
      if (!typeLabels.includes(label)) typeLabels.push(label);
    }

    const name = `${pick(NAME_FIRST[primary], rng.int(4))} ${pick(
      NAME_SECOND[secondary ?? primary],
      rng.int(4),
    )}`;
    const emoji = EMOJI_BANK[primary];

    // Verbs draw without replacement so the 3 move names are always distinct.
    const verbPool = [...MOVE_VERBS];
    const moves = Array.from({ length: 3 }, (_, i) => {
      const typeLabel = pick(typeLabels, rng.int(typeLabels.length));
      const [verb] = verbPool.splice(rng.int(verbPool.length), 1);
      if (verb === undefined) throw new Error("verb pool exhausted");
      const category =
        i === 2 && rng.chance(60) ? "status" : rng.chance(50) ? "physical" : "special";
      const isStatus = category === "status";
      const effect: MoveEffect = isStatus
        ? pick(EFFECT_POOL, rng.int(EFFECT_POOL.length))
        : rng.chance(40)
          ? pick(EFFECT_POOL, rng.int(EFFECT_POOL.length))
          : "none";
      return {
        name: `${typeLabel} ${verb}`,
        type: typeLabel,
        category,
        power: isStatus ? 0 : 40 + rng.int(9) * 10,
        accuracy: 80 + rng.int(21),
        pp: 5 + rng.int(4) * 5,
        effect,
        effectChance: effect === "none" ? 0 : isStatus ? 100 : 10 + rng.int(4) * 10,
      };
    });

    const [firstParent, secondParent] = [request.parentA.name, request.parentB.name].sort();
    const flavor = `Fused from ${firstParent} and ${secondParent}. The workbench takes no responsibility.`;
    return Promise.resolve(JSON.stringify({ name, emoji, types: typeLabels, moves, flavor }));
  }
}
