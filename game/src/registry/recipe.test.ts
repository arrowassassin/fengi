import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalRecipeKey, recipeHash } from "./recipe";

describe("recipe canonicalization (spec §6)", () => {
  it("is order-independent", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (a, b) => {
        expect(canonicalRecipeKey(a, b)).toBe(canonicalRecipeKey(b, a));
        expect(recipeHash(a, b)).toBe(recipeHash(b, a));
      }),
    );
  });

  it("distinct pairs get distinct keys (no separator collisions)", () => {
    expect(canonicalRecipeKey("ab", "c")).not.toBe(canonicalRecipeKey("a", "bc"));
  });

  it("hash is 64-bit and stable", () => {
    const h = recipeHash("spec-1", "spec-2");
    expect(h).toBe(recipeHash("spec-2", "spec-1"));
    expect(h >= 0n && h < 1n << 64n).toBe(true);
  });
});
