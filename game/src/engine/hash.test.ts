import { describe, expect, it } from "vitest";
import { fnv1a64, hashToHex } from "./hash";

describe("fnv1a64", () => {
  // Known FNV-1a 64-bit vectors.
  it("matches known vectors", () => {
    expect(fnv1a64("")).toBe(0xcbf29ce484222325n);
    expect(fnv1a64("a")).toBe(0xaf63dc4c8601ec8cn);
    expect(fnv1a64("foobar")).toBe(0x85944171f73967e8n);
  });

  it("is stable and 64-bit wide", () => {
    const h = fnv1a64("Molten Fern 🌿");
    expect(h).toBe(fnv1a64("Molten Fern 🌿"));
    expect(h >= 0n && h < 1n << 64n).toBe(true);
  });

  it("hashes UTF-8 bytes, so emoji differ from lookalikes", () => {
    expect(fnv1a64("seal 🔥")).not.toBe(fnv1a64("seal 🔶"));
  });

  it("hashToHex pads to 16 chars", () => {
    expect(hashToHex(0x1n)).toBe("0000000000000001");
    expect(hashToHex(fnv1a64("foobar"))).toBe("85944171f73967e8");
  });
});
