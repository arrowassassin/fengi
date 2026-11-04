import { z } from "zod";
import type { Session } from "../games/registry";
export const recordSchema = z.object({
  version: z.literal(1),
  id: z.string().max(150),
  game: z.enum(["signal", "orbit", "odd", "trail", "pairs"]),
  mode: z.enum(["daily", "practice"]),
  label: z.string().max(60),
  updated: z.number().finite(),
  completed: z.boolean(),
  summary: z.string().max(150),
  state: z.unknown(),
});
export type SavedRecord = z.infer<typeof recordSchema>;
export const STORAGE_KEY = "fengi:progress:v1";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function readRecords(storage: StorageLike): SavedRecord[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  if (raw.length > 1_000_000) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 100).flatMap((item) => {
    const parsed = recordSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
export function saveRecord(storage: StorageLike, record: SavedRecord): void {
  const records = readRecords(storage).filter((r) => r.id !== record.id);
  storage.setItem(STORAGE_KEY, JSON.stringify([record, ...records].slice(0, 60)));
}
export function makeRecord(
  session: Session,
  state: unknown,
  completed: boolean,
  summary: string,
): SavedRecord {
  return {
    version: 1,
    id: session.id,
    game: session.game,
    mode: session.mode,
    label: session.label,
    state,
    completed,
    summary,
    updated: Date.now(),
  };
}
