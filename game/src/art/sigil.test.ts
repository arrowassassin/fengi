import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sigilCommands } from "./sigil";

const arbHash = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

describe("sigil seals (spec §7e, 64-bit seeded)", () => {
  it("same hash + emoji → identical draw commands (device-independent art)", () => {
    fc.assert(
      fc.property(arbHash, (hash) => {
        const a = sigilCommands(hash, "🌿");
        const b = sigilCommands(hash, "🌿");
        expect(a).toEqual(b);
      }),
    );
  });

  it("different hashes → different seals (64-bit spread)", () => {
    const seen = new Set<string>();
    for (let i = 0n; i < 64n; i++) {
      seen.add(JSON.stringify(sigilCommands((i * 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n), "🔥")));
    }
    expect(seen.size).toBe(64);
  });

  it("all geometry stays inside the unit square with sane radii", () => {
    fc.assert(
      fc.property(arbHash, (hash) => {
        for (const cmd of sigilCommands(hash, "⚡")) {
          if (cmd.op === "ring") {
            expect(cmd.r).toBeGreaterThan(0);
            expect(cmd.r).toBeLessThanOrEqual(0.5);
          } else if (cmd.op === "spoke") {
            expect(cmd.r0).toBeLessThan(cmd.r1);
            expect(cmd.r1).toBeLessThanOrEqual(0.5);
          } else if (cmd.op === "mark") {
            expect(cmd.x).toBeGreaterThanOrEqual(0);
            expect(cmd.x).toBeLessThanOrEqual(1);
            expect(cmd.y).toBeGreaterThanOrEqual(0);
            expect(cmd.y).toBeLessThanOrEqual(1);
          }
        }
      }),
    );
  });

  it("emits exactly one centered glyph command carrying the emoji", () => {
    fc.assert(
      fc.property(arbHash, fc.constantFrom("🔥", "💧", "🐍"), (hash, emoji) => {
        const glyphs = sigilCommands(hash, emoji).filter((c) => c.op === "glyph");
        expect(glyphs).toHaveLength(1);
        expect(glyphs[0]?.op === "glyph" && glyphs[0].emoji).toBe(emoji);
      }),
    );
  });

  it("has structural variety: 2-4 rings and 5-11 spokes", () => {
    fc.assert(
      fc.property(arbHash, (hash) => {
        const cmds = sigilCommands(hash, "❄️");
        const rings = cmds.filter((c) => c.op === "ring" && !c.dashed).length;
        const spokes = cmds.filter((c) => c.op === "spoke").length;
        expect(rings).toBeGreaterThanOrEqual(2);
        expect(rings).toBeLessThanOrEqual(4);
        expect(spokes).toBeGreaterThanOrEqual(5);
        expect(spokes).toBeLessThanOrEqual(11);
      }),
    );
  });
});
