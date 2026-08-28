import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { STARTERS } from "../content/starters";
import { DeterministicAdapter } from "./adapters/deterministic";
import type { CraftAdapter } from "./adapters/types";
import { craftElement } from "./pipeline";

const garbageAdapter: CraftAdapter = {
  name: "garbage",
  invent: () => Promise.resolve("]]]{{{ not json"),
};

const throwingAdapter: CraftAdapter = {
  name: "throwing",
  invent: () => Promise.reject(new Error("network down")),
};

function starterPair(i: number, j: number) {
  const a = STARTERS[i % STARTERS.length];
  const b = STARTERS[j % STARTERS.length];
  if (a === undefined || b === undefined) throw new Error("no starters");
  return [a, b] as const;
}

describe("craft pipeline (spec §3: crafting never fails)", () => {
  it("crafts a valid specimen via the deterministic adapter", async () => {
    const [a, b] = starterPair(0, 1);
    const result = await craftElement(a, b, new DeterministicAdapter());
    expect(result.provenance).toBe("llm"); // adapter output was accepted
    expect(result.specimen.moves).toHaveLength(4);
    expect(result.specimen.types.length).toBeGreaterThanOrEqual(1);
    expect(result.specimen.generation).toBe(1);
    expect(result.specimen.stats.hp).toBeGreaterThan(0);
  });

  it("same parents → identical crafted specimen (deterministic path)", async () => {
    const [a, b] = starterPair(2, 3);
    const r1 = await craftElement(a, b, new DeterministicAdapter());
    const r2 = await craftElement(b, a, new DeterministicAdapter());
    expect(r1.specimen.name).toBe(r2.specimen.name);
    expect(r1.specimen.recipeHash).toBe(r2.specimen.recipeHash);
    expect(r1.specimen.stats).toEqual(r2.specimen.stats);
  });

  it("falls back and still succeeds when the adapter emits garbage", async () => {
    const [a, b] = starterPair(0, 2);
    const result = await craftElement(a, b, garbageAdapter);
    expect(result.provenance).toBe("fallback");
    expect(result.specimen.moves).toHaveLength(4);
  });

  it("falls back and still succeeds when the adapter throws", async () => {
    const [a, b] = starterPair(1, 3);
    const result = await craftElement(a, b, throwingAdapter);
    expect(result.provenance).toBe("fallback");
  });

  it("bounds retries at 3 and recovers when a later attempt is valid", async () => {
    const [a, b] = starterPair(0, 3);
    let calls = 0;
    const flaky: CraftAdapter = {
      name: "flaky",
      invent: (req) => {
        calls++;
        if (calls < 3) return Promise.resolve("not json yet");
        return new DeterministicAdapter().invent(req);
      },
    };
    const recovered = await craftElement(a, b, flaky);
    expect(recovered.provenance).toBe("llm");
    expect(calls).toBe(3);

    let garbageCalls = 0;
    const countingGarbage: CraftAdapter = {
      name: "counting-garbage",
      invent: () => {
        garbageCalls++;
        return Promise.resolve("]]]{{{ not json");
      },
    };
    const fallen = await craftElement(a, b, countingGarbage);
    expect(fallen.provenance).toBe("fallback");
    expect(garbageCalls).toBe(3); // 1 try + 2 retries, then deterministic fallback
  });

  it("never throws for any starter pair (property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 7 }),
        fc.constantFrom(garbageAdapter, throwingAdapter, new DeterministicAdapter()),
        async (i, j, adapter) => {
          const [a, b] = starterPair(i, j);
          const result = await craftElement(a, b, adapter);
          expect(result.specimen.moves).toHaveLength(4);
          expect(result.specimen.generation).toBe(Math.max(a.generation, b.generation) + 1);
        },
      ),
      { numRuns: 25 },
    );
  });

  it("crafted specimens can battle deterministically", async () => {
    const [a, b] = starterPair(0, 1);
    const [c, d] = starterPair(2, 3);
    const childA = (await craftElement(a, b, new DeterministicAdapter())).specimen;
    const childB = (await craftElement(c, d, new DeterministicAdapter())).specimen;
    const { aiPolicy, runBattle, serializeLog } = await import("../engine");
    const squad0 = [childA, a, b];
    const squad1 = [childB, c, d];
    const r1 = runBattle([squad0, squad1], 99n, [aiPolicy, aiPolicy]);
    const r2 = runBattle([squad0, squad1], 99n, [aiPolicy, aiPolicy]);
    expect(serializeLog(r1.log)).toBe(serializeLog(r2.log));
  });
});
