import type { SavedRecord } from "./persistence";
import type { RemoteSave } from "./progress-client";
export type RemoteProgress = { saves: RemoteSave[]; profileId: string };
/** Pure view composition. The history reader never writes or acknowledges editor-owned saves. */
export function progressView(local: SavedRecord[], remote: RemoteProgress): SavedRecord[] {
  const result = new Map(local.map((record) => [record.id, record]));
  for (const item of remote.saves) {
    const cached = result.get(item.record.id);
    if (
      cached &&
      (cached.pending ||
        !cached.profileId ||
        cached.profileId !== remote.profileId ||
        (cached.baseRevision ?? 0) > item.revision)
    )
      continue;
    result.set(item.record.id, {
      ...item.record,
      profileId: remote.profileId,
      baseRevision: item.revision,
      pending: false,
    });
  }
  return [...result.values()].sort((a, b) => b.updated - a.updated);
}
