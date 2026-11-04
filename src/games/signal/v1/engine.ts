import { random, shuffled } from "../../releases/random-v1";
export type Cell = -1 | 0 | 1;
export type Puzzle = { solution: Cell[]; givens: Cell[]; rows: number[]; columns: number[] };
export function totals(cells: Cell[]) {
  return {
    rows: Array.from(
      { length: 5 },
      (_, r) => cells.slice(r * 5, r * 5 + 5).filter((v) => v === 1).length,
    ),
    columns: Array.from(
      { length: 5 },
      (_, c) => cells.filter((v, i) => i % 5 === c && v === 1).length,
    ),
  };
}
/** Row-pattern backtracking with column pruning, stops as soon as ambiguity is proven. */
export function solutionCount(
  givens: Cell[],
  rows: number[],
  columns: number[],
  limit = 2,
): number {
  const patterns = rows.map((sum, r) =>
    Array.from({ length: 32 }, (_, n) => Array.from({ length: 5 }, (_, c) => (n >> c) & 1)).filter(
      (row) =>
        row.reduce((a, b) => a + b, 0) === sum &&
        row.every((v, c) => givens[r * 5 + c] === -1 || givens[r * 5 + c] === v),
    ),
  );
  let count = 0;
  function visit(r: number, sums: number[]) {
    if (count >= limit) return;
    if (r === 5) {
      if (sums.every((v, c) => v === columns[c])) count++;
      return;
    }
    for (const row of patterns[r]) {
      const next = sums.map((v, c) => v + row[c]);
      if (next.every((v, c) => v <= columns[c] && v + 4 - r >= columns[c])) visit(r + 1, next);
    }
  }
  visit(0, [0, 0, 0, 0, 0]);
  return count;
}
export function createPuzzle(seed: string): Puzzle {
  const rng = random(`signal:v1:${seed}`);
  const solution: Cell[] = Array.from({ length: 25 }, () => (rng() > 0.5 ? 1 : 0));
  const { rows, columns } = totals(solution);
  const givens = [...solution];
  for (const i of shuffled(
    Array.from({ length: 25 }, (_, i) => i),
    rng,
  )) {
    const previous = givens[i];
    givens[i] = -1;
    if (solutionCount(givens, rows, columns) !== 1) givens[i] = previous;
    if (givens.filter((v) => v !== -1).length <= 7) break;
  }
  return { solution, givens, rows, columns };
}
export function cycle(value: Cell): Cell {
  return value === -1 ? 1 : value === 1 ? 0 : -1;
}
export function isSolved(values: Cell[], puzzle: Puzzle) {
  return values.length === 25 && values.every((v, i) => v === puzzle.solution[i]);
}
