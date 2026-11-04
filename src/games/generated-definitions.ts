import { z } from "zod";
import { type GeneratedPack, generatedPuzzle } from "./generated-content";
import { distance, hazards, initialOrbit, type OrbitState, STEP } from "./orbit/v1/engine";
import type { Session } from "./registry";
import type {
  OrbitCommand,
  PairCommand,
  PairState,
  SignalCommand,
  SignalState,
} from "./releases/definitions-v1";
import { validateV1 } from "./releases/v1";
import type { GameDefinition } from "./runtime/contracts";
import { type Cell, cycle, isSolved } from "./signal/v1/engine";

const count = z.number().int().min(0).max(1000000),
  cells = z.array(z.union([z.literal(-1), z.literal(0), z.literal(1)])).length(25);
function define<S, C>(
  initial: () => S,
  reduce: GameDefinition<S, C>["reduce"],
  check: (value: unknown) => S,
  summaryFor: (state: S) => { completed: boolean; summary: string },
): GameDefinition<S, C> {
  return {
    version: 2,
    initial,
    reduce,
    validate(_s, v) {
      try {
        return check(v);
      } catch {
        return null;
      }
    },
    describe(_s, v) {
      return summaryFor(check(v));
    },
  };
}
export function signalDefinition(content: GeneratedPack["signal"]) {
  const p = generatedPuzzle(content);
  return define<SignalState, SignalCommand>(
    () => ({ cells: p.givens, history: [], moves: 0, hints: 0 }),
    (_s, state, c) => {
      if (c.type === "undo")
        return {
          ...state,
          cells: state.history.at(-1) ?? state.cells,
          history: state.history.slice(0, -1),
        };
      if (p.givens[c.index] !== -1) return state;
      const hint = c.type === "reveal";
      return {
        cells: state.cells.map((v, i) => (i === c.index ? (hint ? p.solution[i] : cycle(v)) : v)),
        history: [...state.history.slice(-99), state.cells],
        moves: state.moves + (hint ? 0 : 1),
        hints: state.hints + (hint ? 1 : 0),
      };
    },
    (v) => {
      const s = z
        .object({ cells, history: z.array(cells).max(100), moves: count, hints: count })
        .strict()
        .parse(v);
      if (
        ![s.cells, ...s.history].every((b) =>
          b.every((v, i) => p.givens[i] === -1 || p.givens[i] === v),
        )
      )
        throw new Error("Clue mismatch");
      return s;
    },
    (s) => ({
      completed: isSolved(s.cells as Cell[], p),
      summary: `${s.moves} moves · ${s.hints} reveals · unranked`,
    }),
  );
}
export function pairDefinition(content: GeneratedPack["pairs"]) {
  return define<PairState, PairCommand>(
    () => ({ matched: [], turns: 0 }),
    (_s, state, { cards }) => {
      if (
        cards[0] === cards[1] ||
        cards.some((i) => !Number.isInteger(i) || i < 0 || i > 15 || state.matched.includes(i))
      )
        return state;
      return {
        matched:
          content.deck[cards[0]] === content.deck[cards[1]]
            ? [...state.matched, ...cards]
            : state.matched,
        turns: state.turns + 1,
      };
    },
    (v) => {
      const s = z
        .object({ matched: z.array(z.number().int().min(0).max(15)).max(16), turns: count })
        .strict()
        .parse(v);
      if (
        new Set(s.matched).size !== s.matched.length ||
        s.matched.length % 2 ||
        s.turns < s.matched.length / 2 ||
        !s.matched.every(
          (i) => s.matched.filter((j) => content.deck[i] === content.deck[j]).length === 2,
        )
      )
        throw new Error("Invalid matched pairs");
      return s;
    },
    (s) => ({ completed: s.matched.length === 16, summary: `${s.turns} turns · unranked` }),
  );
}
export function generatedTarget(content: GeneratedPack["orbit"], index: number) {
  return content.targets[index % content.targets.length];
}
export function generatedGate(content: GeneratedPack["orbit"], tick: number, index: number) {
  return (tick + content.phases[index]) % 210 < 70;
}
export function orbitDefinition(content: GeneratedPack["orbit"]) {
  return define<OrbitState, OrbitCommand>(
    initialOrbit,
    (_s, state, c) => {
      if (state.done) return state;
      if (c.type === "reverse") return { ...state, direction: state.direction === 1 ? -1 : 1 };
      const tick = state.tick + 1,
        angle =
          (state.angle + state.direction * STEP * content.speed + Math.PI * 2) % (Math.PI * 2);
      let { sparks, lives } = state,
        cooldown = Math.max(0, state.cooldown - 1);
      if (distance(angle, generatedTarget(content, sparks)) < 0.13) sparks++;
      if (
        !cooldown &&
        hazards.some((h, i) => generatedGate(content, tick, i) && distance(angle, h) < 0.11)
      ) {
        lives--;
        cooldown = 70;
      }
      return {
        tick,
        angle,
        direction: state.direction,
        sparks,
        lives,
        cooldown,
        done: lives === 0 || tick >= 2700,
      };
    },
    (v) => validateV1({ game: "orbit" } as Session, v).state as OrbitState,
    (s) => ({ completed: s.done, summary: `${s.sparks} sparks · unranked` }),
  );
}
