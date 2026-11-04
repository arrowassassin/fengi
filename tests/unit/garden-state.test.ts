import { expect, it } from "vitest";
import { describeGarden, gardenState } from "../../src/games/garden-state";
import { shortestRoute } from "../../src/games/trail/engine";

it("versioned garden saves validate every move and compute completion", () => {
  const garden = { walls: [7, 8, 9, 10], seeds: [6, 18, 28] };
  expect(() => gardenState(garden, { version: 2, path: [0] })).toThrow();
  expect(() => gardenState(garden, { version: 1, path: [0, 35] })).toThrow();
  expect(() => gardenState(garden, { version: 1, path: [0, 1, 7] })).toThrow();
  expect(() => gardenState(garden, { version: 1, path: Array(2001).fill(0) })).toThrow();
  const route = shortestRoute(garden.walls, garden.seeds);
  if (!route) throw new Error("fixture");
  expect(describeGarden(garden, gardenState(garden, { version: 1, path: route })).completed).toBe(
    true,
  );
  expect(describeGarden(garden, { version: 1, path: [0] }).completed).toBe(false);
});
