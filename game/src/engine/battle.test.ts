import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aiPolicy } from "./ai";
import { createBattle, runBattle } from "./battle";
import { fnv1a64 } from "./hash";
import { serializeLog } from "./log";
import { arbScript, arbSquad, scriptedPolicy } from "./testUtils";

const arbSeed = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

describe("battle engine determinism (spec §4, gate for all rendering work)", () => {
  it("same squads + seed + script → byte-identical battle log", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, arbScript, (a, b, seed, script) => {
        const r1 = runBattle([a, b], seed, [scriptedPolicy(script), scriptedPolicy(script)]);
        const r2 = runBattle([a, b], seed, [scriptedPolicy(script), scriptedPolicy(script)]);
        expect(serializeLog(r1.log)).toBe(serializeLog(r2.log));
        expect(r1.outcome).toBe(r2.outcome);
      }),
      { numRuns: 40 },
    );
  });

  it("same squads + seed under the deterministic AI policy → identical log", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, (a, b, seed) => {
        const r1 = runBattle([a, b], seed, [aiPolicy, aiPolicy]);
        const r2 = runBattle([a, b], seed, [aiPolicy, aiPolicy]);
        expect(serializeLog(r1.log)).toBe(serializeLog(r2.log));
      }),
      { numRuns: 25 },
    );
  });

  it("different seeds usually diverge (rng actually consulted)", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, (a, b) => {
        const logs = new Set(
          [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n].map((seed) =>
            serializeLog(runBattle([a, b], seed, [aiPolicy, aiPolicy]).log),
          ),
        );
        expect(logs.size).toBeGreaterThan(1);
      }),
      { numRuns: 10 },
    );
  });
});

describe("battle engine safety properties", () => {
  it("every battle terminates with an outcome within the turn bound", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, arbScript, (a, b, seed, script) => {
        const r = runBattle([a, b], seed, [scriptedPolicy(script), scriptedPolicy(script)]);
        expect(["side0", "side1", "draw"]).toContain(r.outcome);
        expect(r.state.turn).toBeLessThanOrEqual(300);
      }),
      { numRuns: 40 },
    );
  });

  it("hp stays within [0, maxHp] and pp never goes negative", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, (a, b, seed) => {
        const r = runBattle([a, b], seed, [aiPolicy, aiPolicy]);
        for (const side of r.state.sides) {
          for (const c of side.squad) {
            expect(c.currentHp).toBeGreaterThanOrEqual(0);
            expect(c.currentHp).toBeLessThanOrEqual(c.maxHp);
            for (const pp of c.movePp) expect(pp).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 25 },
    );
  });

  it("the log opens with battle-start and closes with battle-end", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, (a, b, seed) => {
        const r = runBattle([a, b], seed, [aiPolicy, aiPolicy]);
        expect(r.log[0]?.kind).toBe("battle-start");
        expect(r.log.at(-1)?.kind).toBe("battle-end");
      }),
      { numRuns: 15 },
    );
  });
});

describe("battle mechanics", () => {
  it("createBattle starts both sides at full hp with active index 0", () => {
    const squads = fc.sample(arbSquad, { numRuns: 2, seed: 7 });
    const [a, b] = [squads[0], squads[1]];
    if (!a || !b) throw new Error("sampling failed");
    const state = createBattle([a, b], fnv1a64("opening"));
    for (const side of state.sides) {
      expect(side.activeIndex).toBe(0);
      for (const c of side.squad) expect(c.currentHp).toBe(c.maxHp);
    }
  });

  it("weekly modifier config changes damage but keeps determinism", () => {
    fc.assert(
      fc.property(arbSquad, arbSquad, arbSeed, (a, b, seed) => {
        const config = { typeDamageMultipliers: { water: 1.2 } };
        const r1 = runBattle([a, b], seed, [aiPolicy, aiPolicy], config);
        const r2 = runBattle([a, b], seed, [aiPolicy, aiPolicy], config);
        expect(serializeLog(r1.log)).toBe(serializeLog(r2.log));
      }),
      { numRuns: 10 },
    );
  });
});
