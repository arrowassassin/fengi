import { describe, expect, it } from "vitest";
import { parseCrafted } from "./schema";

const validPayload = {
  name: "BANNED WEATHER BOOKS",
  emoji: "📕",
  types: ["PAPER", "IDEA"],
  moves: [
    {
      name: "CITATION STORM",
      type: "PAPER",
      category: "physical",
      power: 70,
      accuracy: 95,
      pp: 15,
      effect: "burn",
      effectChance: 20,
    },
    {
      name: "PLOT TWIST",
      type: "IDEA",
      category: "special",
      power: 60,
      accuracy: 100,
      pp: 20,
      effect: "drain",
      effectChance: 100,
    },
    {
      name: "REDACT",
      type: "PAPER",
      category: "status",
      power: 0,
      accuracy: 100,
      pp: 10,
      effect: "debuff-attack",
      effectChance: 100,
    },
  ],
  flavor: "The forecast is whatever it says it is.",
};

describe("parseCrafted (fusion JSON: freeform invented types, exactly 3 moves)", () => {
  it("accepts a fully valid payload and derives mechanical archetypes", () => {
    const r = parseCrafted(JSON.stringify(validPayload));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("BANNED WEATHER BOOKS");
      expect(r.value.types.map((t) => t.label)).toEqual(["PAPER", "IDEA"]);
      // Keyword families: PAPER → wood, IDEA → arcane. Deterministic mapping.
      expect(r.value.types.map((t) => t.archetype)).toEqual(["wood", "arcane"]);
      expect(r.value.moves).toHaveLength(3);
      expect(r.value.moves[0].typeLabel).toBe("PAPER");
      expect(r.value.moves[0].type).toBe("wood");
    }
  });

  it("uppercases lowercase invented labels", () => {
    const r = parseCrafted(JSON.stringify({ ...validPayload, types: ["vapor"] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.types[0]?.label).toBe("VAPOR");
  });

  it("accepts JSON wrapped in markdown fences or prose", () => {
    const wrapped = `Here you go!\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\`\nEnjoy.`;
    expect(parseCrafted(wrapped).ok).toBe(true);
  });

  it.each([
    ["not JSON at all", "the answer is fire"],
    ["missing moves", JSON.stringify({ ...validPayload, moves: undefined })],
    ["two moves", JSON.stringify({ ...validPayload, moves: validPayload.moves.slice(0, 2) })],
    [
      "four moves",
      JSON.stringify({ ...validPayload, moves: [...validPayload.moves, validPayload.moves[0]] }),
    ],
    ["type label too long", JSON.stringify({ ...validPayload, types: ["A".repeat(17)] })],
    ["type label with junk chars", JSON.stringify({ ...validPayload, types: ["<SCRIPT>"] })],
    ["single-char type label", JSON.stringify({ ...validPayload, types: ["X"] })],
    ["zero types", JSON.stringify({ ...validPayload, types: [] })],
    ["three types", JSON.stringify({ ...validPayload, types: ["PAPER", "IDEA", "LAW"] })],
    ["empty name", JSON.stringify({ ...validPayload, name: "" })],
    ["plain text in the emoji field", JSON.stringify({ ...validPayload, emoji: "abc" })],
    ["family-ZWJ emoji over 3 code points", JSON.stringify({ ...validPayload, emoji: "👨‍👩‍👧‍👦" })],
    ["flavor over 140 chars", JSON.stringify({ ...validPayload, flavor: "x".repeat(141) })],
    [
      "unknown effect",
      JSON.stringify({
        ...validPayload,
        moves: [{ ...validPayload.moves[0], effect: "instakill" }, ...validPayload.moves.slice(1)],
      }),
    ],
    [
      "power out of range",
      JSON.stringify({
        ...validPayload,
        moves: [{ ...validPayload.moves[0], power: 900 }, ...validPayload.moves.slice(1)],
      }),
    ],
  ])("rejects %s", (_label, raw) => {
    expect(parseCrafted(raw).ok).toBe(false);
  });

  it("is immune to __proto__/constructor pollution in hostile payloads", () => {
    const hostile = JSON.stringify({
      ...validPayload,
      moves: [
        { ...validPayload.moves[0], __proto__: { polluted: true } },
        ...validPayload.moves.slice(1),
      ],
    }).replace(
      '{"name":"BANNED WEATHER BOOKS"',
      '{"__proto__":{"polluted":true},"name":"BANNED WEATHER BOOKS"',
    );
    const r = parseCrafted(hostile);
    expect(r.ok).toBe(true);
    // biome-ignore lint/suspicious/noExplicitAny: probing for pollution
    expect(({} as any).polluted).toBeUndefined();
    if (r.ok) {
      expect(Object.getPrototypeOf(r.value)).toBe(Object.prototype);
      expect(Object.keys(r.value).sort()).toEqual(["emoji", "flavor", "moves", "name", "types"]);
    }
  });

  it("clamps/normalizes whitespace in names and trims flavor", () => {
    const r = parseCrafted(JSON.stringify({ ...validPayload, name: "  BANNED   BOOKS  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("BANNED BOOKS");
  });

  it("same label always maps to the same archetype (device-independent)", () => {
    for (const label of ["VAPOR", "GOSSIP", "XYZZY", "MOONBEAM"]) {
      const a = parseCrafted(JSON.stringify({ ...validPayload, types: [label] }));
      const b = parseCrafted(JSON.stringify({ ...validPayload, types: [label] }));
      expect(a.ok && b.ok && a.value.types[0]?.archetype).toBe(b.ok && b.value.types[0]?.archetype);
    }
  });
});
