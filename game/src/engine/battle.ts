import { fnv1a64, hashToHex } from "./hash";
import type { BattleEvent, Side } from "./log";
import { type Move, type MoveEffect, STRUGGLE } from "./moves";
import { createRng, type Rng } from "./rng";
import type { Specimen } from "./specimen";
import { effectiveness } from "./types";

/** Battle-stage keys (attack/defense split by category, plus speed). */
const STAGE_KEYS = ["attack", "defense", "spAttack", "spDefense", "speed"] as const;
type StageKey = (typeof STAGE_KEYS)[number];
export type Stages = Record<StageKey, number>;

export type PersistentStatus = "none" | "burn" | "poison";

export interface CombatantState {
  specimen: Specimen;
  maxHp: number;
  currentHp: number;
  movePp: [number, number, number, number];
  status: PersistentStatus;
  /** Set once when the combatant faints, so the event logs exactly once. */
  fainted: boolean;
  /** Turns of stun remaining (skips the action). */
  stunTurns: number;
  /** Turns of shield remaining (halves incoming damage). */
  shieldTurns: number;
  stages: Stages;
}

export interface SideState {
  squad: CombatantState[];
  activeIndex: number;
}

export interface BattleConfig {
  /** Weekly modifier hook: per-move-type damage multipliers (spec §5). */
  typeDamageMultipliers?: Partial<Record<string, number>>;
  maxTurns?: number;
}

export type Outcome = "side0" | "side1" | "draw";

export interface BattleState {
  rng: Rng;
  turn: number;
  sides: [SideState, SideState];
  log: BattleEvent[];
  config: BattleConfig;
  outcome?: Outcome;
}

export type Action =
  | { kind: "move"; moveIndex: 0 | 1 | 2 | 3 }
  | { kind: "switch"; squadIndex: number }
  | { kind: "struggle" };

export type Policy = (state: BattleState, side: Side) => Action;

export interface BattleResult {
  state: BattleState;
  log: BattleEvent[];
  outcome: Outcome;
}

const LEVEL = 50;
const DEFAULT_MAX_TURNS = 300;

function makeCombatant(specimen: Specimen): CombatantState {
  const maxHp = specimen.stats.hp + 60;
  return {
    specimen,
    maxHp,
    currentHp: maxHp,
    movePp: [
      specimen.moves[0].pp,
      specimen.moves[1].pp,
      specimen.moves[2].pp,
      specimen.moves[3].pp,
    ],
    status: "none",
    fainted: false,
    stunTurns: 0,
    shieldTurns: 0,
    stages: { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  };
}

export function createBattle(
  squads: [Specimen[], Specimen[]],
  seed: bigint,
  config: BattleConfig = {},
): BattleState {
  const sides: [SideState, SideState] = [
    { squad: squads[0].map(makeCombatant), activeIndex: 0 },
    { squad: squads[1].map(makeCombatant), activeIndex: 0 },
  ];
  const state: BattleState = {
    rng: createRng(seed),
    turn: 0,
    sides,
    log: [],
    config,
  };
  state.log.push({
    kind: "battle-start",
    seed: hashToHex(seed),
    squads: [squads[0].map((s) => s.name), squads[1].map((s) => s.name)],
  });
  return state;
}

function active(state: BattleState, side: Side): CombatantState {
  const s = state.sides[side];
  const combatant = s.squad[s.activeIndex];
  if (combatant === undefined) throw new Error("invalid active index");
  return combatant;
}

function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function clampStage(v: number): number {
  return Math.max(-4, Math.min(4, v));
}

export function legalActions(state: BattleState, side: Side): Action[] {
  const me = state.sides[side];
  const combatant = active(state, side);
  const actions: Action[] = [];
  combatant.movePp.forEach((pp, i) => {
    if (pp > 0) actions.push({ kind: "move", moveIndex: i as 0 | 1 | 2 | 3 });
  });
  if (actions.length === 0) actions.push({ kind: "struggle" });
  me.squad.forEach((c, i) => {
    if (i !== me.activeIndex && c.currentHp > 0) actions.push({ kind: "switch", squadIndex: i });
  });
  return actions;
}

function effectiveSpeed(c: CombatantState): number {
  return Math.floor(c.specimen.stats.speed * stageMultiplier(c.stages.speed));
}

interface DamageOutcome {
  damage: number;
  crit: boolean;
  effectiveness: number;
}

function computeDamage(
  state: BattleState,
  attacker: CombatantState,
  defender: CombatantState,
  move: Move,
  isStruggle: boolean,
): DamageOutcome {
  const special = move.category === "special";
  const atkStat = special ? attacker.specimen.stats.spAttack : attacker.specimen.stats.attack;
  const defStat = special ? defender.specimen.stats.spDefense : defender.specimen.stats.defense;
  const atkStage = stageMultiplier(special ? attacker.stages.spAttack : attacker.stages.attack);
  const defStage = stageMultiplier(special ? defender.stages.spDefense : defender.stages.defense);
  const burnPenalty = !special && attacker.status === "burn" ? 0.5 : 1;

  const eff = isStruggle ? 1 : effectiveness(move.type, defender.specimen.types);
  if (eff === 0 || move.power <= 0) return { damage: 0, crit: false, effectiveness: eff };

  const stab = !isStruggle && attacker.specimen.types.includes(move.type) ? 1.5 : 1;
  const crit = state.rng.int(16) === 0;
  const variance = (85 + state.rng.int(16)) / 100;
  const modTable = state.config.typeDamageMultipliers ?? {};
  const weekly = isStruggle ? 1 : (modTable[move.type] ?? 1);

  const attack = atkStat * atkStage * burnPenalty;
  const defense = Math.max(1, defStat * defStage);
  const base = Math.floor(
    Math.floor((((2 * LEVEL) / 5 + 2) * move.power * attack) / defense / 50) + 2,
  );
  const shield = defender.shieldTurns > 0 ? 0.5 : 1;
  let damage = Math.floor(base * stab * eff * (crit ? 1.5 : 1) * variance * weekly * shield);
  damage = Math.max(1, damage);
  return { damage, crit, effectiveness: eff };
}

function dealDamage(target: CombatantState, amount: number): void {
  target.currentHp = Math.max(0, target.currentHp - amount);
}

function applyEffect(
  state: BattleState,
  userSide: Side,
  effect: MoveEffect,
  damageDealt: number,
): void {
  const targetSide: Side = userSide === 0 ? 1 : 0;
  const user = active(state, userSide);
  const target = active(state, targetSide);

  const stage = (who: CombatantState, side: Side, stat: StageKey, delta: number): void => {
    const before = who.stages[stat];
    who.stages[stat] = clampStage(before + delta);
    if (who.stages[stat] !== before) {
      state.log.push({ kind: "stage-change", side, name: who.specimen.name, stat, delta });
    }
  };

  switch (effect) {
    case "none":
      return;
    case "burn":
    case "poison":
      if (target.status === "none" && target.currentHp > 0) {
        target.status = effect;
        state.log.push({
          kind: "status-applied",
          side: targetSide,
          name: target.specimen.name,
          effect,
        });
      }
      return;
    case "stun":
      if (target.stunTurns === 0 && target.currentHp > 0) {
        target.stunTurns = 1;
        state.log.push({
          kind: "status-applied",
          side: targetSide,
          name: target.specimen.name,
          effect,
        });
      }
      return;
    case "shield":
      user.shieldTurns = 2; // protects through the rest of this turn and the next
      state.log.push({ kind: "status-applied", side: userSide, name: user.specimen.name, effect });
      return;
    case "drain": {
      const healed = Math.min(Math.floor(damageDealt / 2), user.maxHp - user.currentHp);
      if (healed > 0) {
        user.currentHp += healed;
        state.log.push({
          kind: "heal",
          side: userSide,
          name: user.specimen.name,
          amount: healed,
          remainingHp: user.currentHp,
        });
      }
      return;
    }
    case "heal": {
      const healed = Math.min(Math.floor(user.maxHp / 2), user.maxHp - user.currentHp);
      if (healed > 0) {
        user.currentHp += healed;
        state.log.push({
          kind: "heal",
          side: userSide,
          name: user.specimen.name,
          amount: healed,
          remainingHp: user.currentHp,
        });
      }
      return;
    }
    case "buff-attack":
      stage(user, userSide, "attack", 1);
      stage(user, userSide, "spAttack", 1);
      return;
    case "buff-defense":
      stage(user, userSide, "defense", 1);
      stage(user, userSide, "spDefense", 1);
      return;
    case "buff-speed":
      stage(user, userSide, "speed", 1);
      return;
    case "debuff-attack":
      stage(target, targetSide, "attack", -1);
      stage(target, targetSide, "spAttack", -1);
      return;
    case "debuff-defense":
      stage(target, targetSide, "defense", -1);
      stage(target, targetSide, "spDefense", -1);
      return;
    case "debuff-speed":
      stage(target, targetSide, "speed", -1);
      return;
  }
}

function executeMove(state: BattleState, side: Side, action: Action): void {
  const me = active(state, side);
  if (me.currentHp <= 0) return;

  if (me.stunTurns > 0) {
    me.stunTurns -= 1;
    state.log.push({ kind: "stun-skip", side, name: me.specimen.name });
    return;
  }

  const isStruggle = action.kind === "struggle";
  let move: Move;
  if (isStruggle) {
    move = STRUGGLE;
  } else if (action.kind === "move") {
    const chosen = me.specimen.moves[action.moveIndex];
    const pp = me.movePp[action.moveIndex];
    if (pp <= 0) {
      move = STRUGGLE;
    } else {
      me.movePp[action.moveIndex] = pp - 1;
      move = chosen;
    }
  } else {
    return; // switches handled elsewhere
  }

  state.log.push({
    kind: "move-used",
    side,
    name: me.specimen.name,
    move: move.name,
    struggle: isStruggle || move === STRUGGLE,
  });

  if (!state.rng.chance(move.accuracy)) {
    state.log.push({ kind: "move-missed", side, name: me.specimen.name, move: move.name });
    return;
  }

  const targetSide: Side = side === 0 ? 1 : 0;
  const target = active(state, targetSide);
  let damageDealt = 0;

  if (move.power > 0) {
    const outcome = computeDamage(state, me, target, move, move === STRUGGLE);
    if (outcome.effectiveness === 0) {
      state.log.push({
        kind: "damage",
        side: targetSide,
        name: target.specimen.name,
        amount: 0,
        remainingHp: target.currentHp,
        effectiveness: 0,
        crit: false,
      });
    } else {
      damageDealt = Math.min(outcome.damage, target.currentHp);
      dealDamage(target, outcome.damage);
      state.log.push({
        kind: "damage",
        side: targetSide,
        name: target.specimen.name,
        amount: damageDealt,
        remainingHp: target.currentHp,
        effectiveness: outcome.effectiveness,
        crit: outcome.crit,
      });
      if (move === STRUGGLE) {
        const recoil = Math.min(Math.floor(damageDealt / 4), me.currentHp);
        if (recoil > 0) {
          dealDamage(me, recoil);
          state.log.push({
            kind: "recoil",
            side,
            name: me.specimen.name,
            amount: recoil,
            remainingHp: me.currentHp,
          });
        }
      }
    }
  }

  if (move.effect !== "none" && (move.power === 0 || damageDealt > 0)) {
    if (state.rng.chance(move.effectChance)) {
      applyEffect(state, side, move.effect, damageDealt);
    }
  }

  checkFaint(state, targetSide);
  checkFaint(state, side);
}

function checkFaint(state: BattleState, side: Side): void {
  const combatant = active(state, side);
  if (combatant.currentHp > 0 || combatant.fainted) return;
  combatant.fainted = true;
  state.log.push({ kind: "faint", side, name: combatant.specimen.name });
}

function autoSwitchIfFainted(state: BattleState, side: Side): boolean {
  const s = state.sides[side];
  const combatant = active(state, side);
  if (combatant.currentHp > 0) return true;
  const nextIndex = s.squad.findIndex((c, i) => i !== s.activeIndex && c.currentHp > 0);
  if (nextIndex === -1) return false;
  s.activeIndex = nextIndex;
  const next = s.squad[nextIndex];
  if (next !== undefined) {
    state.log.push({ kind: "switch", side, name: next.specimen.name, squadIndex: nextIndex });
  }
  return true;
}

function endOfTurnTicks(state: BattleState): void {
  for (const side of [0, 1] as const) {
    const combatant = active(state, side);
    if (combatant.currentHp <= 0) continue;
    if (combatant.status === "poison") {
      const amount = Math.max(1, Math.floor(combatant.maxHp / 8));
      dealDamage(combatant, amount);
      state.log.push({
        kind: "status-tick",
        side,
        name: combatant.specimen.name,
        effect: "poison",
        amount,
      });
      checkFaint(state, side);
    } else if (combatant.status === "burn") {
      const amount = Math.max(1, Math.floor(combatant.maxHp / 16));
      dealDamage(combatant, amount);
      state.log.push({
        kind: "status-tick",
        side,
        name: combatant.specimen.name,
        effect: "burn",
        amount,
      });
      checkFaint(state, side);
    }
    if (combatant.shieldTurns > 0) combatant.shieldTurns -= 1;
  }
}

function sideDefeated(state: BattleState, side: Side): boolean {
  return state.sides[side].squad.every((c) => c.currentHp <= 0);
}

function settleOutcome(state: BattleState): boolean {
  const dead0 = sideDefeated(state, 0);
  const dead1 = sideDefeated(state, 1);
  if (!dead0 && !dead1) return false;
  state.outcome = dead0 && dead1 ? "draw" : dead0 ? "side1" : "side0";
  return true;
}

/** Runs one full turn. Mutates and returns the state. */
export function stepTurn(state: BattleState, actions: [Action, Action]): BattleState {
  if (state.outcome !== undefined) return state;
  state.turn += 1;
  state.log.push({ kind: "turn-start", turn: state.turn });

  // Switches resolve first, in side order.
  for (const side of [0, 1] as const) {
    const action = actions[side];
    if (action.kind === "switch") {
      const s = state.sides[side];
      const target = s.squad[action.squadIndex];
      if (target !== undefined && target.currentHp > 0 && action.squadIndex !== s.activeIndex) {
        s.activeIndex = action.squadIndex;
        state.log.push({
          kind: "switch",
          side,
          name: target.specimen.name,
          squadIndex: action.squadIndex,
        });
      }
    }
  }

  // Moves resolve by effective speed; ties break by seeded rng.
  const movers = ([0, 1] as const).filter((side) => actions[side].kind !== "switch");
  movers.sort((a, b) => {
    const speedA = effectiveSpeed(active(state, a));
    const speedB = effectiveSpeed(active(state, b));
    if (speedA !== speedB) return speedB - speedA;
    return 0;
  });
  if (movers.length === 2) {
    const first = movers[0];
    const second = movers[1];
    if (
      first !== undefined &&
      second !== undefined &&
      effectiveSpeed(active(state, first)) === effectiveSpeed(active(state, second)) &&
      state.rng.chance(50)
    ) {
      movers.reverse();
    }
  }

  // A replacement sent in after a faint does not act on the turn it enters.
  const intendedActors: [CombatantState, CombatantState] = [active(state, 0), active(state, 1)];
  for (const side of movers) {
    if (state.outcome !== undefined) break;
    if (active(state, side) !== intendedActors[side]) continue;
    const action = actions[side];
    executeMove(state, side, action);
    // Both sides must have an active combatant before the next move resolves.
    for (const s of [0, 1] as const) {
      if (!autoSwitchIfFainted(state, s) && settleOutcome(state)) break;
    }
    if (state.outcome !== undefined) break;
  }

  if (state.outcome === undefined) {
    endOfTurnTicks(state);
    for (const s of [0, 1] as const) {
      if (!autoSwitchIfFainted(state, s)) {
        settleOutcome(state);
        break;
      }
    }
  }

  const maxTurns = state.config.maxTurns ?? DEFAULT_MAX_TURNS;
  if (state.outcome === undefined && state.turn >= maxTurns) {
    state.outcome = "draw";
  }
  if (state.outcome !== undefined) {
    state.log.push({ kind: "battle-end", outcome: state.outcome, turns: state.turn });
  }
  return state;
}

export function runBattle(
  squads: [Specimen[], Specimen[]],
  seed: bigint,
  policies: [Policy, Policy],
  config: BattleConfig = {},
): BattleResult {
  const state = createBattle(squads, seed, config);
  while (state.outcome === undefined) {
    const actions: [Action, Action] = [policies[0](state, 0), policies[1](state, 1)];
    stepTurn(state, actions);
  }
  return { state, log: state.log, outcome: state.outcome };
}

/** Convenience: derive a battle seed from arbitrary context strings. */
export function battleSeed(...parts: string[]): bigint {
  return fnv1a64(parts.join("::"));
}
