import { dailyPrompts, judge } from "../odd/v1/engine";
import { advance, initialOrbit, type OrbitState } from "../orbit/v1/engine";
import { createDeck, isPair } from "../pairs/v1/engine";
import type { Session } from "../registry";
import type { GameDefinition } from "../runtime/contracts";
import { type Cell, createPuzzle, cycle } from "../signal/v1/engine";
import { createGarden, neighbors } from "../trail/v1/engine";
import { validateV1 } from "./v1";

function definition<S, C>(
  initial: (session: Session) => S,
  reduce: GameDefinition<S, C>["reduce"],
): GameDefinition<S, C> {
  return {
    version: 1,
    initial,
    reduce,
    validate(session, value) {
      try {
        return validateV1(session, value).state as S;
      } catch {
        return null;
      }
    },
    describe(session, state) {
      const { completed, summary } = validateV1(session, state);
      return { completed, summary };
    },
  };
}
export type SignalState = { cells: Cell[]; history: Cell[][]; moves: number; hints: number };
export type SignalCommand = { type: "cycle" | "reveal"; index: number } | { type: "undo" };
export const signalGame = definition<SignalState, SignalCommand>(
  (s) => ({ cells: createPuzzle(s.seed).givens, history: [], moves: 0, hints: 0 }),
  (session, state, command) => {
    if (command.type === "undo")
      return {
        ...state,
        cells: state.history.at(-1) ?? state.cells,
        history: state.history.slice(0, -1),
      };
    const puzzle = createPuzzle(session.seed),
      index = command.index;
    if (!Number.isInteger(index) || index < 0 || index >= 25 || puzzle.givens[index] !== -1)
      return state;
    const hint = command.type === "reveal";
    return {
      cells: state.cells.map((v, i) => (i === index ? (hint ? puzzle.solution[i] : cycle(v)) : v)),
      history: [...state.history.slice(-99), state.cells],
      moves: state.moves + (hint ? 0 : 1),
      hints: state.hints + (hint ? 1 : 0),
    };
  },
);
export type TrailState = { path: number[] };
export type TrailCommand = { type: "move"; to: number } | { type: "undo" } | { type: "reset" };
export const trailGame = definition<TrailState, TrailCommand>(
  () => ({ path: [0] }),
  (session, state, command) => {
    if (command.type === "reset") return { path: [0] };
    if (command.type === "undo")
      return { path: state.path.length > 1 ? state.path.slice(0, -1) : state.path };
    const garden = createGarden(session.seed);
    return state.path.length <= 1000 &&
      neighbors(state.path.at(-1) ?? 0).includes(command.to) &&
      !garden.walls.includes(command.to)
      ? { path: [...state.path, command.to] }
      : state;
  },
);
export type PairState = { matched: number[]; turns: number };
export type PairCommand = { type: "choose-pair"; cards: [number, number] };
export const pairGame = definition<PairState, PairCommand>(
  () => ({ matched: [], turns: 0 }),
  (session, state, { cards }) => {
    if (
      cards[0] === cards[1] ||
      cards.some((i) => !Number.isInteger(i) || i < 0 || i > 15 || state.matched.includes(i))
    )
      return state;
    return {
      matched: isPair(createDeck(session.seed), ...cards)
        ? [...state.matched, ...cards]
        : state.matched,
      turns: state.turns + 1,
    };
  },
);
export type OddState = { answers: (string | null)[] };
export type OddCommand = { type: "answer"; answer: string | null };
export const oddGame = definition<OddState, OddCommand>(
  () => ({ answers: [] }),
  (session, state, command) => {
    if (state.answers.length >= 3) return state;
    const accepted =
      command.answer === null
        ? null
        : judge(dailyPrompts(session.seed)[state.answers.length], command.answer)?.word;
    return accepted === undefined ? state : { answers: [...state.answers, accepted] };
  },
);
export type OrbitCommand = { type: "reverse" } | { type: "step" };
export const orbitGame = definition<OrbitState, OrbitCommand>(
  () => initialOrbit(),
  (session, state, command) => {
    if (state.done) return state;
    return command.type === "reverse"
      ? { ...state, direction: state.direction === 1 ? -1 : 1 }
      : advance(state, session.seed, session.calm);
  },
);
