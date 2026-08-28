import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { deriveStats, STAT_KEYS, statTotal } from "./stats";

describe("deriveStats (recipe-hash → base stats)", () => {
  it("is deterministic", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }),
        fc.integer({ min: 0, max: 10 }),
        (hash, gen) => {
          expect(deriveStats(hash, gen)).toEqual(deriveStats(hash, gen));
        },
      ),
    );
  });

  it("stays within the bounded budget with sane per-stat floors", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }),
        fc.integer({ min: 0, max: 10 }),
        (hash, gen) => {
          const stats = deriveStats(hash, gen);
          const total = statTotal(stats);
          expect(total).toBeGreaterThanOrEqual(400);
          expect(total).toBeLessThanOrEqual(560);
          for (const key of STAT_KEYS) {
            expect(stats[key]).toBeGreaterThanOrEqual(key === "hp" ? 50 : 30);
            expect(stats[key]).toBeLessThanOrEqual(160);
          }
        },
      ),
    );
  });

  it("later generations trend no weaker (small bounded bonus)", () => {
    const h = 0xdeadbeefcafef00dn;
    expect(statTotal(deriveStats(h, 5))).toBeGreaterThanOrEqual(statTotal(deriveStats(h, 0)));
  });
});
