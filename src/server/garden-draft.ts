import { z } from "zod";
import { shortestRoute } from "../games/trail/engine";
export const gardenSchema = z
  .object({
    walls: z.array(z.number().int().min(1).max(34)).min(4).max(12),
    seeds: z.array(z.number().int().min(1).max(34)).length(3),
  })
  .strict();
export function validateGarden(value: unknown) {
  const garden = gardenSchema.parse(value);
  if (
    new Set(garden.walls).size !== garden.walls.length ||
    new Set(garden.seeds).size !== 3 ||
    garden.seeds.some((c) => garden.walls.includes(c))
  )
    throw new Error("Duplicate or overlapping cells");
  const route = shortestRoute(garden.walls, garden.seeds);
  if (!route || route.length < 11 || route.length > 45) throw new Error("Unplayable garden");
  return {
    walls: [...garden.walls].sort((a, b) => a - b),
    seeds: [...garden.seeds].sort((a, b) => a - b),
  };
}
