import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { STARTERS } from "../content/starters";
import { badgeSpecFor, badgeSvg, lockedBadgeSvg, ringSvg } from "./badge";

const arbHash = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

describe("holo-decal badges (handoff CRITICAL SYSTEM, 64-bit seeded per spec §7)", () => {
  it("same recipe hash → byte-identical badge everywhere", () => {
    fc.assert(
      fc.property(arbHash, (hash) => {
        const spec = { glyph: "🔥", ink: "tangerine" as const, tier: 2, foil: false };
        expect(badgeSvg(spec, hash, "t")).toBe(badgeSvg(spec, hash, "t"));
      }),
    );
  });

  it("different hashes → different badges (64-bit spread)", () => {
    const spec = { glyph: "🔥", ink: "paper" as const, tier: 1, foil: false };
    const seen = new Set<string>();
    for (let i = 0n; i < 64n; i++) {
      seen.add(badgeSvg(spec, (i * 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n), "t"));
    }
    expect(seen.size).toBe(64);
  });

  it("spike count follows tier: n = 6 + tier×3 (2n polygon vertices)", () => {
    for (const tier of [0, 1, 2, 3, 4]) {
      const svg = badgeSvg({ glyph: "⚡", ink: "lime", tier, foil: false }, 42n, "t");
      const mainPolygon = /<polygon points="([^"]+)" fill="var\(--aa-panel\)"/.exec(svg);
      expect(mainPolygon).not.toBeNull();
      const vertices = (mainPolygon?.[1] ?? "").split(" ").length;
      expect(vertices).toBe(2 * (6 + tier * 3));
    }
  });

  it("tier ≥ 2 adds the stroke-only underburst; tier ≤ 1 does not", () => {
    const low = badgeSvg({ glyph: "🔥", ink: "paper", tier: 1, foil: false }, 7n, "t");
    const high = badgeSvg({ glyph: "🔥", ink: "paper", tier: 2, foil: false }, 7n, "t");
    expect(low.match(/<polygon/g)?.length).toBe(2); // shadow + main
    expect(high.match(/<polygon/g)?.length).toBe(3); // + underburst
  });

  it("foil badges use the holo gradient + off-white stroke + ink glyph", () => {
    const svg = badgeSvg({ glyph: "📕", ink: "paper", tier: 3, foil: true }, 9n, "t");
    expect(svg).toContain('fill="url(#fg-t)"');
    expect(svg).toContain('stroke="var(--aa-paper)" stroke-width="3"');
    expect(svg).toContain('fill="var(--aa-ink)">📕');
    expect(svg).toContain("foil");
  });

  it("only design-token colors appear — no hex literals besides the black shadow", () => {
    const svg = badgeSvg({ glyph: "💧", ink: "cyan", tier: 2, foil: true }, 3n, "t");
    const hexes = svg.match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
    expect(hexes.every((h) => h === "#000" || h.startsWith("#fg") || h.startsWith("#ht"))).toBe(
      true,
    );
  });

  it("badgeSpecFor maps palette discipline and derives tier from generation", () => {
    const flame = STARTERS[0];
    if (flame === undefined) throw new Error("no starters");
    const spec = badgeSpecFor(flame);
    expect(spec.ink).toBe("tangerine"); // fire → hostile tangerine
    expect(spec.tier).toBe(0); // primitive
    expect(spec.foil).toBe(false); // primitives never foil
  });

  it("locked badge is the dashed ? slot", () => {
    expect(lockedBadgeSvg()).toContain('stroke-dasharray="8 7"');
    expect(lockedBadgeSvg()).toContain(">?</text>");
  });
});

describe("segmented HP ring (no health bars)", () => {
  it("renders 12 segments, filled count = round(pct × 12)", () => {
    const svg = ringSvg(0.5, "lime", { seed: 1n });
    const paths = svg.match(/<path /g) ?? [];
    expect(paths.length).toBe(12);
    const filled = svg.match(/stroke="var\(--aa-lime\)" stroke-width="11"/g) ?? [];
    expect(filled.length).toBe(6);
  });

  it("cracked ring turns the damage edge tangerine and dashed with shards", () => {
    const svg = ringSvg(0.4, "cyan", { cracked: true, seed: 2n });
    expect(svg).toContain("var(--aa-tangerine)");
    expect(svg).toContain('stroke-dasharray="7 5"');
    expect((svg.match(/<line /g) ?? []).length).toBe(3); // 3 shard lines
  });

  it("shattered ring is 12 debris lines, no arcs", () => {
    const svg = ringSvg(0, "lime", { shattered: true, seed: 3n });
    expect((svg.match(/<line /g) ?? []).length).toBe(12);
    expect(svg).not.toContain("<path");
  });

  it("is deterministic per seed", () => {
    expect(ringSvg(0.75, "lime", { cracked: true, seed: 11n })).toBe(
      ringSvg(0.75, "lime", { cracked: true, seed: 11n }),
    );
  });
});
