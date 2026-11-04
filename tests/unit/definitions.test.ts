import { describe, expect, it } from "vitest";
import { createDeck } from "../../src/games/pairs/v1/engine";
import { sessionFor } from "../../src/games/registry";
import {
  oddGame,
  orbitGame,
  pairGame,
  signalGame,
  trailGame,
} from "../../src/games/releases/definitions-v1";
import { createPuzzle } from "../../src/games/signal/v1/engine";

describe("renderer-independent version-one commands", () => {
  it("replays a signal command and undo without mutating a historical snapshot", () => {
    const session = sessionFor("signal", new URLSearchParams("mode=practice&seed=contract"));
    const initial = signalGame.initial(session),
      snapshot = JSON.stringify(initial);
    const index = createPuzzle(session.seed).givens.indexOf(-1);
    const next = signalGame.reduce(session, initial, { type: "cycle", index });
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(next.moves).toBe(1);
    expect(signalGame.validate(session, JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(signalGame.reduce(session, next, { type: "undo" }).cells).toEqual(initial.cells);
    expect(signalGame.reduce(session, initial, { type: "cycle", index: -1 })).toBe(initial);
  });
  it("retains serializable old saves across every presentation", () => {
    for (const game of ["signal", "trail", "pairs", "odd", "orbit"] as const) {
      const session = sessionFor(game, new URLSearchParams("mode=practice&seed=contract"));
      const definition = {
        signal: signalGame,
        trail: trailGame,
        pairs: pairGame,
        odd: oddGame,
        orbit: orbitGame,
      }[game];
      const snapshot = JSON.parse(JSON.stringify(definition.initial(session)));
      expect(definition.validate(session, snapshot)).toEqual(snapshot);
      expect(definition.validate(session, { invalid: true })).toBeNull();
    }
  });
  it("rejects illegal moves, records real pairs, and steps deterministic arcade state", () => {
    const s = (game: "trail" | "pairs" | "odd" | "orbit") =>
      sessionFor(game, new URLSearchParams("mode=practice&seed=contract"));
    const trail = trailGame.initial(s("trail"));
    expect(trailGame.reduce(s("trail"), trail, { type: "move", to: 35 })).toBe(trail);
    const pairSession = s("pairs"),
      deck = createDeck(pairSession.seed);
    const match = deck.findIndex((value, i) => i > 0 && value === deck[0]);
    const paired = pairGame.reduce(pairSession, pairGame.initial(pairSession), {
      type: "choose-pair",
      cards: [0, match],
    });
    expect(paired).toEqual({ matched: [0, match], turns: 1 });
    expect(pairGame.validate(pairSession, paired)).toEqual(paired);
    const odd = oddGame.initial(s("odd"));
    expect(
      oddGame.reduce(s("odd"), odd, { type: "answer", answer: "invalid category answer" }),
    ).toBe(odd);
    const orbit = orbitGame.initial(s("orbit"));
    const next = orbitGame.reduce(s("orbit"), orbit, { type: "step" });
    expect(next).not.toEqual(orbit);
    expect(orbitGame.validate(s("orbit"), next)).toEqual(next);
  });
});
