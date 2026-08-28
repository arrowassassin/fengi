import { describe, expect, it } from "vitest";
import { parseCrafted } from "./schema";

const validPayload = {
  name: "Molten Fern",
  emoji: "🌋",
  types: ["fire", "wood"],
  moves: [
    {
      name: "Cinder Lash",
      type: "fire",
      category: "physical",
      power: 70,
      accuracy: 95,
      pp: 15,
      effect: "burn",
      effectChance: 20,
    },
    {
      name: "Verdant Coil",
      type: "wood",
      category: "special",
      power: 60,
      accuracy: 100,
      pp: 20,
      effect: "drain",
      effectChance: 100,
    },
    {
      name: "Ashen Veil",
      type: "fire",
      category: "status",
      power: 0,
      accuracy: 100,
      pp: 10,
      effect: "debuff-attack",
      effectChance: 100,
    },
    {
      name: "Root Slam",
      type: "earth",
      category: "physical",
      power: 80,
      accuracy: 90,
      pp: 10,
      effect: "none",
      effectChance: 0,
    },
  ],
  flavor: "Born where the forest kissed the caldera.",
};

describe("parseCrafted (strict fusion JSON schema, spec §3)", () => {
  it("accepts a fully valid payload", () => {
    const r = parseCrafted(JSON.stringify(validPayload));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("Molten Fern");
      expect(r.value.types).toEqual(["fire", "wood"]);
      expect(r.value.moves).toHaveLength(4);
    }
  });

  it("accepts JSON wrapped in markdown fences or prose", () => {
    const wrapped = `Here you go!\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\`\nEnjoy.`;
    expect(parseCrafted(wrapped).ok).toBe(true);
  });

  it.each([
    ["not JSON at all", "the answer is fire"],
    ["missing moves", JSON.stringify({ ...validPayload, moves: undefined })],
    ["three moves", JSON.stringify({ ...validPayload, moves: validPayload.moves.slice(0, 3) })],
    [
      "five moves",
      JSON.stringify({ ...validPayload, moves: [...validPayload.moves, validPayload.moves[0]] }),
    ],
    ["unknown type", JSON.stringify({ ...validPayload, types: ["dragon"] })],
    ["zero types", JSON.stringify({ ...validPayload, types: [] })],
    ["three types", JSON.stringify({ ...validPayload, types: ["fire", "wood", "water"] })],
    ["empty name", JSON.stringify({ ...validPayload, name: "" })],
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

  it("clamps/normalizes whitespace in names and trims flavor", () => {
    const r = parseCrafted(JSON.stringify({ ...validPayload, name: "  Molten   Fern  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("Molten Fern");
  });
});
