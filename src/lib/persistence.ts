import { z } from "zod";
import { type Session, sessionFromId } from "../games/registry";
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
  profileId: z.string().uuid().optional(),
  baseRevision: z.number().int().nonnegative().optional(),
  pending: z.boolean().optional(),
  mutationId: z.string().uuid().optional(),
});
export type SavedRecord = z.infer<typeof recordSchema>;
export const STORAGE_KEY = "fengi:progress:v1";
export const RECORD_PREFIX = "fengi:save:";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  readonly length?: number;
  key?(index: number): string | null;
  removeItem?(key: string): void;
}
/** All retained records, including pending edits outside the history display window. */
export function readAllRecords(storage: StorageLike): SavedRecord[] {
  const individual: SavedRecord[] = [];
  if (storage.key && typeof storage.length === "number") {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(RECORD_PREFIX)) continue;
      try {
        const raw = storage.getItem(key);
        if (!raw || raw.length > 32768) continue;
        const parsed = recordSchema.safeParse(JSON.parse(raw));
        if (parsed.success && sessionFromId(parsed.data.id)) individual.push(parsed.data);
      } catch {
        /* Keep other valid sessions. */
      }
    }
  }
  const legacy = readLegacy(storage).filter((r) => !individual.some((s) => s.id === r.id));
  return [...individual, ...legacy].sort((a, b) => b.updated - a.updated);
}
export function readRecords(storage: StorageLike, limit = 60): SavedRecord[] {
  return readAllRecords(storage).slice(0, limit);
}
/** Exact lookup must never depend on ordering, age, or the 60-item history window. */
export function readRecord(storage: StorageLike, id: string): SavedRecord | undefined {
  const raw = storage.getItem(RECORD_PREFIX + id);
  if (raw && raw.length <= 32768) {
    try {
      const parsed = recordSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.id === id && sessionFromId(id)) return parsed.data;
    } catch {
      /* Legacy fallback is still available. */
    }
  }
  return readLegacy(storage).find((record) => record.id === id);
}
function readLegacy(storage: StorageLike): SavedRecord[] {
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
  if (storage.key && typeof storage.length === "number") {
    storage.setItem(RECORD_PREFIX + record.id, JSON.stringify(record));
    // Never prune another session here: another tab can edit it between read and delete.
    // The history view is bounded; retained cache is removed only by explicit user action.
    return;
  }
  const records = readRecords(storage).filter((r) => r.id !== record.id);
  storage.setItem(STORAGE_KEY, JSON.stringify([record, ...records].slice(0, 60)));
}
export function removeRecord(storage: StorageLike, id: string) {
  storage.removeItem?.(RECORD_PREFIX + id);
  storage.setItem(STORAGE_KEY, JSON.stringify(readLegacy(storage).filter((r) => r.id !== id)));
}
export function clearRecords(storage: StorageLike) {
  if (storage.key && typeof storage.length === "number") {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key?.(i)).filter(
      (k): k is string => !!k?.startsWith(RECORD_PREFIX),
    );
    for (const key of keys) storage.removeItem?.(key);
  }
  storage.removeItem?.(STORAGE_KEY);
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
