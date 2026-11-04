import { expect, it } from "vitest";
import { generatedPuzzle, validatePack } from "../../src/games/generated-content";
import {
  orbitDefinition,
  pairDefinition,
  signalDefinition,
} from "../../src/games/generated-definitions";
import { sessionFor } from "../../src/games/registry";
import { solutionCount } from "../../src/games/signal/v1/engine";
import { fixturePack } from "../fixtures/generated-pack";

it("validates bounded game-specific layouts, repairs ambiguity and rejects malformed content", () => {
  const pack = validatePack(fixturePack),
    p = generatedPuzzle(pack.signal);
  expect(solutionCount(p.givens, p.rows, p.columns)).toBe(1);
  expect(() => validatePack({ ...pack, pairs: { deck: Array(16).fill(0) } })).toThrow();
  expect(() =>
    validatePack({ ...pack, signal: { ...pack.signal, clues: [0, 0, 1, 2] } }),
  ).toThrow();
  expect(() => validatePack({ ...pack, orbit: { ...pack.orbit, speed: 99 } })).toThrow();
  expect(() => validatePack({ ...pack, html: "<script>" })).toThrow();
});
it("generated definitions compute completion and reject forged state", () => {
  const session = sessionFor(
    "signal",
    new URLSearchParams({ mode: "practice", version: "2", seed: "test" }),
  );
  const d = signalDefinition(fixturePack.signal);
  let state = d.initial(session);
  for (let i = 0; i < 25; i++) state = d.reduce(session, state, { type: "reveal", index: i });
  expect(d.describe(session, state).completed).toBe(true);
  const pairs = pairDefinition(fixturePack.pairs);
  expect(pairs.validate(session, { matched: [0, 1], turns: 1 })).toBeNull();
  const orbit = orbitDefinition(fixturePack.orbit);
  let o = orbit.initial(session);
  for (let n = 0; n < 2700; n++) o = orbit.reduce(session, o, { type: "step" });
  expect(o.done).toBe(true);
  expect(orbit.describe(session, o).completed).toBe(true);
});
