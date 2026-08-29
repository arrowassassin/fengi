import { describe, expect, it } from "vitest";
import { effectiveness, isElementType, TYPES } from "./types";

describe("type chart", () => {
  it("has 12 types", () => {
    expect(TYPES).toHaveLength(12);
    expect(new Set(TYPES).size).toBe(12);
  });

  it("every matchup returns one of the legal multipliers", () => {
    for (const atk of TYPES) {
      for (const def of TYPES) {
        expect([0, 0.5, 1, 2]).toContain(effectiveness(atk, [def]));
      }
    }
  });

  it("dual-type defenders multiply", () => {
    // fire is strong vs wood and weak vs water in the chart
    expect(effectiveness("fire", ["wood"])).toBe(2);
    expect(effectiveness("fire", ["water"])).toBe(0.5);
    expect(effectiveness("fire", ["wood", "water"])).toBe(1);
  });

  it("every type has at least one strength and one weakness (no dead types)", () => {
    for (const atk of TYPES) {
      const hits = TYPES.map((def) => effectiveness(atk, [def]));
      expect(hits.some((m) => m > 1)).toBe(true);
    }
    for (const def of TYPES) {
      const taken = TYPES.map((atk) => effectiveness(atk, [def]));
      expect(taken.some((m) => m > 1)).toBe(true);
    }
  });

  it("isElementType guards strings", () => {
    expect(isElementType("fire")).toBe(true);
    expect(isElementType("dragon")).toBe(false);
  });
});
