import { describe, expect, it } from "vitest";
import { categories } from "../../src/games/odd/content";
import { dailyPrompts, judge } from "../../src/games/odd/engine";
import { advance, initialOrbit, orbitScore } from "../../src/games/orbit/engine";
import { createDeck, isPair } from "../../src/games/pairs/engine";
import { sessionFor, validDate } from "../../src/games/registry";
import { createPuzzle, cycle, isSolved, solutionCount } from "../../src/games/signal/engine";
import { createGarden, pathMask, shortestRoute, validPath } from "../../src/games/trail/engine";

describe("Signal Grid", () => {
  it("generates unique, deterministic puzzles across varied seeds", () => {
    for (let i = 0; i < 80; i++) {
      const seed = `suite-${i}`,
        p = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(p);
      expect(solutionCount(p.givens, p.rows, p.columns)).toBe(1);
      expect(isSolved(p.solution, p)).toBe(true);
      expect(isSolved(p.givens, p)).toBe(false);
      expect(p.givens.filter((v) => v === -1).length).toBeGreaterThan(4);
    }
  });
  it("detects ambiguity and cycles explicit states", () => {
    expect(solutionCount(Array(25).fill(-1), [1, 1, 1, 1, 1], [1, 1, 1, 1, 1])).toBe(2);
    expect([cycle(-1), cycle(1), cycle(0)]).toEqual([1, 0, -1]);
  });
});
describe("Trail Trace", () => {
  it("proves solvability and shortest path for every generated garden", () => {
    for (let i = 0; i < 100; i++) {
      const garden = createGarden(`seed-${i}`),
        route = shortestRoute(garden.walls, garden.seeds);
      expect(createGarden(`seed-${i}`)).toEqual(garden);
      expect(new Set(garden.seeds).size).toBe(3);
      expect(route).not.toBeNull();
      if (!route) continue;
      expect(validPath(route, garden)).toBe(true);
      expect(pathMask(route, garden.seeds)).toBe(7);
      expect(route.at(-1)).toBe(35);
      expect(route.length - 1).toBe(garden.optimum);
    }
  });
  it("rejects invalid jumps and blocked routes", () => {
    expect(validPath([0, 35], createGarden("a"))).toBe(false);
    expect(shortestRoute([1, 6], [2, 3, 4])).toBeNull();
  });
});
describe("Pair Bloom", () => {
  it("has eight exact pairs and deterministic shuffling", () => {
    for (let i = 0; i < 30; i++) {
      const deck = createDeck(String(i));
      expect(deck).toEqual(createDeck(String(i)));
      expect(deck).toHaveLength(16);
      for (let symbol = 0; symbol < 8; symbol++) {
        const positions = deck.flatMap((v, i) => (v === symbol ? [i] : []));
        expect(positions).toHaveLength(2);
        expect(isPair(deck, positions[0], positions[1])).toBe(true);
        expect(isPair(deck, positions[0], positions[0])).toBe(false);
      }
    }
  });
});
describe("Odd Answer", () => {
  it("normalizes explicit aliases but does not invent semantic matches", () => {
    expect(judge(categories[0], "  NEPTUNE ")?.points).toBe(40);
    expect(judge(categories[0], "Pluto")).toBeNull();
    expect(judge(categories[1], "castle")?.word).toBe("Rook");
    expect(judge(categories[0], "Neptun")).toBeNull();
  });
  it("selects three distinct reviewed prompts", () => {
    for (let i = 0; i < 30; i++) {
      const result = dailyPrompts(String(i));
      expect(new Set(result.map((c) => c.id)).size).toBe(3);
      expect(result).toEqual(dailyPrompts(String(i)));
    }
  });
});
describe("Orbit Tap", () => {
  it("is deterministic and stops simulation at a terminal state", () => {
    function play() {
      let s = initialOrbit();
      for (let i = 0; i < 5000; i++) {
        if (i % 57 === 0) s = { ...s, direction: -s.direction };
        s = advance(s, "orbit-test");
      }
      return s;
    }
    const state = play();
    expect(state).toEqual(play());
    expect(state.done).toBe(true);
    expect(state.tick).toBeLessThanOrEqual(2700);
    expect(state.lives).toBeGreaterThanOrEqual(0);
    expect(advance(state, "orbit-test")).toEqual(state);
    expect(orbitScore(state)).toBe(state.sparks * 10);
  });
  it("isolates calm speed and caps round duration", () => {
    const normal = advance(initialOrbit(), "a"),
      calm = advance(initialOrbit(), "a", true);
    expect(normal.angle).toBeGreaterThan(calm.angle);
    expect(advance({ ...initialOrbit(), tick: 2699 }, "a").done).toBe(true);
  });
});
describe("session identity", () => {
  it("rejects invalid dates and future editions", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2026-11-04")).toBe(true);
    expect(sessionFor("signal", new URLSearchParams("date=2099-01-01"), "2026-11-04").seed).toBe(
      "2026-11-04",
    );
  });
  it("keeps calm out of daily leaderboards and isolates practices", () => {
    expect(sessionFor("orbit", new URLSearchParams("pace=calm"), "2026-11-04").calm).toBe(false);
    expect(
      sessionFor("orbit", new URLSearchParams("mode=practice&seed=abc&pace=calm")).id,
    ).toContain("practice:abc:calm");
  });
});
