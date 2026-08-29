import { describe, expect, it } from "vitest";
import { type Action, createBattle, stepTurn } from "./battle";
import type { BattleEvent } from "./log";
import type { Move } from "./moves";
import { createRng } from "./rng";
import type { Specimen } from "./specimen";
import type { Stats } from "./stats";

/**
 * Fixed-scenario regression tests: hand-built squads with known stats, so the
 * exact damage/tick numbers the engine produces are pinned down. These lock
 * the damage formula (burn penalty, shield halving), status-tick amounts,
 * struggle recoil, and stun/PP accounting against silent drift.
 */

const stats = (o: Partial<Stats> = {}): Stats => ({
  hp: 100,
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  speed: 100,
  ...o,
});

const move = (o: Partial<Move> = {}): Move => ({
  name: "Test Move",
  type: "light",
  typeLabel: "GLOW",
  category: "physical",
  power: 60,
  accuracy: 100,
  pp: 10,
  effect: "none",
  effectChance: 0,
  ...o,
});

/** Status move that does nothing at full HP and consumes no rng. */
const idleMove = (): Move =>
  move({ name: "Idle", category: "status", power: 0, effect: "heal", effectChance: 100 });

function specimen(name: string, s: Stats, moves: [Move, Move, Move]): Specimen {
  return {
    id: `fixed-${name}`,
    name,
    emoji: "🧪",
    types: [{ label: "FIRE", archetype: "fire" }], // "light" vs "arcane": no STAB, neutral
    generation: 0,
    recipeHash: 1n,
    stats: s,
    moves,
  };
}

function defender(name: string, s: Stats): Specimen {
  return {
    ...specimen(name, s, [idleMove(), idleMove(), idleMove()]),
    types: [{ label: "IDEA", archetype: "arcane" }],
  };
}

const useMove0: Action = { kind: "move", moveIndex: 0 };

function firstEvent<K extends BattleEvent["kind"]>(
  log: readonly BattleEvent[],
  kind: K,
): Extract<BattleEvent, { kind: K }> {
  const ev = log.find((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind);
  if (ev === undefined) throw new Error(`no ${kind} event in log`);
  return ev;
}

/**
 * Replicates battle.ts computeDamage for the first move of turn 1 when the
 * attacker acts first with a 100%-accuracy move (crit and variance are then
 * the first two rng draws after createRng).
 */
function expectedFirstDamage(
  seed: bigint,
  opts: { atk: number; def: number; power: number; burn?: boolean; shield?: boolean },
): { damage: number; crit: boolean } {
  const r = createRng(seed);
  const crit = r.int(16) === 0;
  const variance = (85 + r.int(16)) / 100;
  const attack = opts.atk * (opts.burn ? 0.5 : 1);
  const base = Math.floor(
    Math.floor((((2 * 50) / 5 + 2) * opts.power * attack) / opts.def / 50) + 2,
  );
  const damage = Math.floor(base * (crit ? 1.5 : 1) * variance * (opts.shield ? 0.5 : 1));
  return { damage: Math.max(1, damage), crit };
}

describe("fixed-scenario regressions", () => {
  const seed = 0xfeed_beefn;

  it("burn halves physical attack in the damage formula, ticks 1/16, and PP is spent", () => {
    const attacker = () =>
      specimen("Burner", stats({ attack: 100, speed: 200 }), [move({ power: 60 }), move(), move()]);
    const foe = () => defender("Wall", stats({ defense: 100, speed: 5 }));

    const clean = createBattle([[attacker()], [foe()]], seed);
    stepTurn(clean, [useMove0, useMove0]);

    const burned = createBattle([[attacker()], [foe()]], seed);
    const burnedAttacker = burned.sides[0].squad[0];
    if (burnedAttacker === undefined) throw new Error("missing combatant");
    burnedAttacker.status = "burn";
    stepTurn(burned, [useMove0, useMove0]);

    const dClean = firstEvent(clean.log, "damage");
    const dBurned = firstEvent(burned.log, "damage");
    const expClean = expectedFirstDamage(seed, { atk: 100, def: 100, power: 60 });
    const expBurned = expectedFirstDamage(seed, { atk: 100, def: 100, power: 60, burn: true });

    // Same seed => same crit/variance rolls in both battles.
    expect(dClean.crit).toBe(expClean.crit);
    expect(dBurned.crit).toBe(dClean.crit);
    expect(dClean.amount).toBe(expClean.damage);
    expect(dBurned.amount).toBe(expBurned.damage);
    expect(dBurned.amount).toBeLessThan(dClean.amount);

    // Burn end-of-turn tick: max(1, floor(maxHp / 16)) on the burned attacker.
    const tick = firstEvent(burned.log, "status-tick");
    expect(tick).toMatchObject({ side: 0, effect: "burn" });
    expect(tick.amount).toBe(Math.max(1, Math.floor(burnedAttacker.maxHp / 16)));

    // Exactly one PP spent on the used move; the others untouched.
    expect(clean.sides[0].squad[0]?.movePp).toEqual([9, 10, 10]);
  });

  it("shield halves incoming damage and expires after its turns tick down", () => {
    const attacker = () =>
      specimen("Lancer", stats({ attack: 100, speed: 200 }), [move({ power: 60 }), move(), move()]);
    const foe = () => defender("Turtle", stats({ defense: 100, speed: 5 }));

    const control = createBattle([[attacker()], [foe()]], seed);
    stepTurn(control, [useMove0, useMove0]);

    const shielded = createBattle([[attacker()], [foe()]], seed);
    const turtle = shielded.sides[1].squad[0];
    if (turtle === undefined) throw new Error("missing combatant");
    turtle.shieldTurns = 1;
    stepTurn(shielded, [useMove0, useMove0]);

    const dControl = firstEvent(control.log, "damage");
    const dShielded = firstEvent(shielded.log, "damage");
    const expShielded = expectedFirstDamage(seed, {
      atk: 100,
      def: 100,
      power: 60,
      shield: true,
    });
    expect(dShielded.amount).toBe(expShielded.damage);
    expect(dShielded.amount).toBeLessThan(dControl.amount);

    // The shield's last turn has been consumed by the end-of-turn tick.
    expect(turtle.shieldTurns).toBe(0);
  });

  it("poison ticks 1/8 maxHp at end of turn", () => {
    const a = () => specimen("Idler", stats({ speed: 200 }), [idleMove(), idleMove(), idleMove()]);
    const b = () => defender("Sickly", stats({ speed: 5 }));

    const state = createBattle([[a()], [b()]], seed);
    const sickly = state.sides[1].squad[0];
    if (sickly === undefined) throw new Error("missing combatant");
    sickly.status = "poison";
    const hpBefore = sickly.currentHp;
    stepTurn(state, [useMove0, useMove0]);

    const tick = firstEvent(state.log, "status-tick");
    const expected = Math.max(1, Math.floor(sickly.maxHp / 8));
    expect(tick).toMatchObject({ side: 1, effect: "poison", amount: expected });
    expect(sickly.currentHp).toBe(hpBefore - expected);
  });

  it("struggle deals typeless damage with quarter recoil; stun skips the action without spending PP", () => {
    // Attacker is out of PP on every move -> struggle. Its struggle also
    // cannot stun since STRUGGLE has no effect; instead the defender is
    // pre-stunned to check the skip path.
    const exhausted = () =>
      specimen("Husk", stats({ attack: 150, speed: 200 }), [
        move({ pp: 8 }),
        move({ pp: 8 }),
        move({ pp: 8 }),
      ]);
    const foe = () => defender("Patient", stats({ defense: 50, speed: 5 }));

    const state = createBattle([[exhausted()], [foe()]], seed);
    const husk = state.sides[0].squad[0];
    const patient = state.sides[1].squad[0];
    if (husk === undefined || patient === undefined) throw new Error("missing combatant");
    husk.movePp = [0, 0, 0];
    patient.stunTurns = 1;
    const hpBefore = husk.currentHp;

    stepTurn(state, [{ kind: "struggle" }, useMove0]);

    const used = firstEvent(state.log, "move-used");
    expect(used.struggle).toBe(true);

    const dmg = firstEvent(state.log, "damage");
    expect(dmg.side).toBe(1);
    expect(dmg.effectiveness).toBe(1); // typeless: no chart lookup for struggle

    const recoil = firstEvent(state.log, "recoil");
    expect(recoil.amount).toBe(Math.floor(dmg.amount / 4));
    expect(husk.currentHp).toBe(hpBefore - recoil.amount);

    // The stunned defender skipped its action: no PP spent, stun consumed.
    expect(firstEvent(state.log, "stun-skip")).toMatchObject({ side: 1, name: "Patient" });
    expect(patient.movePp).toEqual([10, 10, 10]);
    expect(patient.stunTurns).toBe(0);
  });
});
