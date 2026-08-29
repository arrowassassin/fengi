import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fnv1a64 } from "./hash";
import { createRng, restoreRng } from "./rng";

describe("seeded rng", () => {
  it("same seed → identical stream", () => {
    fc.assert(
      fc.property(fc.string(), (seedText) => {
        const seed = fnv1a64(seedText);
        const a = createRng(seed);
        const b = createRng(seed);
        for (let i = 0; i < 100; i++) {
          expect(a.nextU32()).toBe(b.nextU32());
        }
      }),
    );
  });

  it("different seeds → different streams (overwhelmingly)", () => {
    const a = createRng(1n);
    const b = createRng(2n);
    const streamA = Array.from({ length: 8 }, () => a.nextU32());
    const streamB = Array.from({ length: 8 }, () => b.nextU32());
    expect(streamA).not.toEqual(streamB);
  });

  it("state snapshot restores the exact stream", () => {
    const rng = createRng(fnv1a64("battle"));
    rng.nextU32();
    rng.nextU32();
    const snap = rng.state();
    const restored = restoreRng(snap);
    for (let i = 0; i < 50; i++) {
      expect(restored.nextU32()).toBe(rng.nextU32());
    }
  });

  it("float() ∈ [0,1) and int(n) ∈ [0,n)", () => {
    const rng = createRng(42n);
    for (let i = 0; i < 1000; i++) {
      const f = rng.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const k = rng.int(7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(7);
    }
  });

  it("chance(100) always true, chance(0) always false", () => {
    const rng = createRng(7n);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(100)).toBe(true);
      expect(rng.chance(0)).toBe(false);
    }
  });
});
