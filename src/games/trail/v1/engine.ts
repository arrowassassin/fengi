import { random, shuffled } from "../../releases/random-v1";
export type Garden = { walls: number[]; seeds: number[]; optimum: number };
export function neighbors(cell: number): number[] {
  const r = Math.floor(cell / 6),
    c = cell % 6;
  return [
    r > 0 ? cell - 6 : -1,
    r < 5 ? cell + 6 : -1,
    c > 0 ? cell - 1 : -1,
    c < 5 ? cell + 1 : -1,
  ].filter((v) => v >= 0);
}
export function collect(mask: number, cell: number, seeds: number[]) {
  const index = seeds.indexOf(cell);
  return index < 0 ? mask : mask | (1 << index);
}
export function shortestRoute(walls: number[], seeds: number[]): number[] | null {
  const queue = [{ cell: 0, mask: 0, path: [0] }];
  const seen = new Set(["0:0"]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.cell === 35 && current.mask === 7) return current.path;
    for (const cell of neighbors(current.cell)) {
      if (walls.includes(cell)) continue;
      const mask = collect(current.mask, cell, seeds),
        key = `${cell}:${mask}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ cell, mask, path: [...current.path, cell] });
      }
    }
  }
  return null;
}
export function createGarden(seed: string): Garden {
  const rng = random(`trail:v1:${seed}`),
    cells = shuffled(
      Array.from({ length: 34 }, (_, i) => i + 1),
      rng,
    );
  const seeds = cells.slice(0, 3),
    walls: number[] = [];
  for (const cell of cells.slice(3)) {
    if (walls.length >= 9) break;
    if (shortestRoute([...walls, cell], seeds)) walls.push(cell);
  }
  const route = shortestRoute(walls, seeds);
  if (!route) throw new Error("Garden generation invariant failed");
  return { walls, seeds, optimum: route.length - 1 };
}
export function pathMask(path: number[], seeds: number[]) {
  return path.reduce((mask, cell) => collect(mask, cell, seeds), 0);
}
export function validPath(path: number[], garden: Garden) {
  return (
    path.length > 0 &&
    path[0] === 0 &&
    path.every(
      (cell, i) =>
        Number.isInteger(cell) &&
        cell >= 0 &&
        cell < 36 &&
        !garden.walls.includes(cell) &&
        (i === 0 || neighbors(path[i - 1]).includes(cell)),
    )
  );
}
