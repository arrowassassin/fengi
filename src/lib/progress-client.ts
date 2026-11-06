import { recordSchema, type SavedRecord } from "./persistence";
export type RemoteSave = { record: SavedRecord; revision: number; mutationId: string };
export class SyncError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Fengi-Client": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(8000),
    keepalive: method === "PUT",
  });
  const result = await response.json();
  if (!response.ok)
    throw new SyncError(response.status, result.error || "Progress service is unavailable.");
  return result;
}
export async function loadRemote(): Promise<{ saves: RemoteSave[]; profileId: string }> {
  const load = async () => {
    try {
      return await api("/api/progress");
    } catch (error) {
      if (!(error instanceof SyncError) || error.status !== 401) throw error;
      await api("/api/profile", "POST", {});
      return api("/api/progress");
    }
  };
  const result = navigator.locks
    ? await navigator.locks.request("fengi:profile", load)
    : await load();
  if (!Array.isArray(result.saves)) throw new Error("Invalid progress response");
  return {
    profileId: result.profileId,
    saves: result.saves.map((item: RemoteSave) => ({
      record: recordSchema.parse(item.record),
      revision: item.revision,
      mutationId: item.mutationId,
    })),
  };
}
export function downloadRecords(records: SavedRecord[]) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ format: "fengi-progress-v1", records }, null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "fengi-progress.json";
  a.click();
  URL.revokeObjectURL(url);
}
