import { expect, it } from "vitest";
import { validateGarden } from "../../src/server/garden-draft";

it("validates solvable gardens and rejects duplicates, overlap and blocked routes", () => {
  const garden = { walls: [7, 8, 9, 10], seeds: [6, 18, 28] };
  expect(validateGarden(garden).seeds).toEqual([6, 18, 28]);
  expect(() => validateGarden({ ...garden, seeds: [6, 6, 28] })).toThrow();
  expect(() => validateGarden({ ...garden, seeds: [7, 18, 28] })).toThrow();
  expect(() => validateGarden({ walls: [1, 6, 8, 9], seeds: [10, 18, 28] })).toThrow();
  expect(() => validateGarden({ ...garden, solution: [1] })).toThrow();
});
