import { z } from "zod";
import { type Cell, type Puzzle, solutionCount, totals } from "./signal/v1/engine";
export const packSchema = z
  .object({
    signal: z
      .object({
        solution: z.array(z.union([z.literal(0), z.literal(1)])).length(25),
        clues: z.array(z.number().int().min(0).max(24)).min(4).max(15),
      })
      .strict(),
    pairs: z.object({ deck: z.array(z.number().int().min(0).max(7)).length(16) }).strict(),
    orbit: z
      .object({
        targets: z.array(z.number().min(0.4).max(5.8)).min(4).max(12),
        phases: z.array(z.number().int().min(0).max(209)).length(3),
        speed: z.number().min(1.3).max(2.05),
      })
      .strict(),
  })
  .strict();
export type GeneratedPack = z.infer<typeof packSchema>;
export function generatedPuzzle(signal: GeneratedPack["signal"]): Puzzle {
  const solution = signal.solution as Cell[],
    given = new Set(signal.clues),
    t = totals(solution);
  // Complete ambiguous clue sets deterministically; never change the model's solution.
  for (
    let i = 0;
    i < 25 &&
    solutionCount(
      solution.map((v, j) => (given.has(j) ? v : -1)),
      t.rows,
      t.columns,
    ) !== 1;
    i++
  )
    given.add(i);
  return { solution, givens: solution.map((v, i) => (given.has(i) ? v : -1)), ...t };
}
export function validatePack(input: unknown): GeneratedPack {
  const p = packSchema.parse(input);
  if (
    new Set(p.signal.clues).size !== p.signal.clues.length ||
    p.signal.solution.every((v) => v === p.signal.solution[0])
  )
    throw new Error("Invalid signal design");
  if (
    Array.from({ length: 8 }, (_, i) => p.pairs.deck.filter((v) => v === i).length).some(
      (n) => n !== 2,
    )
  )
    throw new Error("Unbalanced memory deck");
  if (
    new Set(p.orbit.phases).size !== 3 ||
    new Set(p.orbit.targets).size !== p.orbit.targets.length
  )
    throw new Error("Duplicate orbit schedule");
  if (
    p.orbit.targets.some((a, i) =>
      p.orbit.targets.some(
        (b, j) => i !== j && Math.min(Math.abs(a - b), Math.PI * 2 - Math.abs(a - b)) < 0.28,
      ),
    )
  )
    throw new Error("Orbit targets too close");
  const puzzle = generatedPuzzle(p.signal);
  if (
    puzzle.givens.filter((v) => v === -1).length < 5 ||
    solutionCount(puzzle.givens, puzzle.rows, puzzle.columns) !== 1
  )
    throw new Error("Insufficient playable signal cells");
  p.signal.clues.sort((a, b) => a - b);
  return p;
}
