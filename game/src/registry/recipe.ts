import { fnv1a64 } from "../engine";

/**
 * Canonical recipe identity (spec §6): an unordered parent pair. Length
 * prefixes prevent separator collisions ("ab"+"c" vs "a"+"bc").
 */
export function canonicalRecipeKey(parentIdA: string, parentIdB: string): string {
  const [first, second] = [parentIdA, parentIdB].sort();
  return `recipe:v1:${first?.length ?? 0}:${first ?? ""}:${second?.length ?? 0}:${second ?? ""}`;
}

/** 64-bit recipe hash — seeds stats, sigil art, and registry identity. */
export function recipeHash(parentIdA: string, parentIdB: string): bigint {
  return fnv1a64(canonicalRecipeKey(parentIdA, parentIdB));
}
