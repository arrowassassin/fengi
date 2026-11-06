import { z } from "zod";
import { pathMask, validPath } from "./trail/engine";
export type GardenLayout = { walls: number[]; seeds: number[] };
export function gardenState(garden: GardenLayout, value: unknown) {
  const state = z
    .object({ version: z.literal(1), path: z.array(z.number().int()).min(1).max(2000) })
    .strict()
    .parse(value);
  if (!validPath(state.path, { ...garden, optimum: 0 })) throw new Error("Invalid garden path");
  return state;
}
export function describeGarden(garden: GardenLayout, state: ReturnType<typeof gardenState>) {
  const completed = state.path.at(-1) === 35 && pathMask(state.path, garden.seeds) === 7;
  return {
    completed,
    summary: `Generated garden · ${state.path.length - 1} moves · ${completed ? "complete" : "in progress"}`,
  };
}
