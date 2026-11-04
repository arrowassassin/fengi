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

it("generated Orbit calm scales movement while preserving v1 pace and separate save identities", async () => {
  const { advance, initialOrbit } = await import("../../src/games/orbit/v1/engine");
  const definition = orbitDefinition(fixturePack.orbit);
  const standard = sessionFor(
    "orbit",
    new URLSearchParams({ mode: "practice", version: "2", seed: "pace-test" }),
  );
  const calm = sessionFor(
    "orbit",
    new URLSearchParams({ mode: "practice", version: "2", seed: "pace-test", pace: "calm" }),
  );
  let a = definition.initial(standard),
    b = definition.initial(calm),
    v1 = initialOrbit(),
    v1Calm = initialOrbit();
  for (let n = 0; n < 60; n++) {
    a = definition.reduce(standard, a, { type: "step" });
    b = definition.reduce(calm, b, { type: "step" });
    v1 = advance(v1, "pace-test", false);
    v1Calm = advance(v1Calm, "pace-test", true);
  }
  expect(a.angle).toBeCloseTo(fixturePack.orbit.speed, 10);
  expect(b.angle).toBeCloseTo((fixturePack.orbit.speed * 1.3) / 2.05, 10);
  expect(b.angle).toBeLessThan(a.angle);
  expect(calm.id).not.toBe(standard.id);
  expect(v1.angle).toBeCloseTo(2.05, 10);
  expect(v1Calm.angle).toBeCloseTo(1.3, 10);
  // Resume retains the saved angle/tick, then advances at the selected slower rate.
  const restored = definition.validate(calm, JSON.parse(JSON.stringify(b)));
  if (!restored) throw new Error("Invalid fixture");
  const resumed = definition.reduce(calm, restored, { type: "step" });
  expect(resumed.tick).toBe(61);
  expect(resumed.angle - b.angle).toBeCloseTo((fixturePack.orbit.speed * (1.3 / 2.05)) / 60, 10);
});
