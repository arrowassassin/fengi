"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../games/registry";
import { makeRecord, readRecords, type SavedRecord, saveRecord } from "../lib/persistence";
import { api, loadRemote, SyncError } from "../lib/progress-client";

/** One editor per tab lease; server revisions arbitrate devices and retries. */
export function useSavedGame<T>(
  session: Session,
  initial: T,
  validate: (value: unknown) => T | null,
  describe: (state: T) => { completed: boolean; summary: string },
) {
  const [state, setState] = useState(initial),
    [ready, setReady] = useState(false),
    [warning, setWarning] = useState("");
  const validator = useRef(validate),
    description = useRef(describe);
  validator.current = validate;
  description.current = describe;
  const revision = useRef(0),
    owner = useRef<string | undefined>(undefined),
    connected = useRef(false),
    storageFailed = useRef(false),
    resumedMutation = useRef<string | undefined>(undefined),
    blocked = useRef(false),
    queue = useRef<SavedRecord | null>(null),
    busy = useRef(false),
    mounted = useRef(true),
    initialized = useRef(false);
  const warn = useCallback((message: string) => {
    if (mounted.current) setWarning(message);
  }, []);
  const local = useCallback(
    (record: SavedRecord) => {
      try {
        saveRecord(localStorage, record);
      } catch {
        storageFailed.current = true;
        warn(
          "Browser storage is unavailable. Server saves are still attempted; keep this tab open until saved.",
        );
      }
    },
    [warn],
  );
  const conflict = useCallback(() => {
    blocked.current = true;
    warn("Progress changed elsewhere. Your local copy has been kept.");
    window.dispatchEvent(new CustomEvent("fengi:conflict", { detail: session.id }));
  }, [session.id, warn]);
  const flush = useCallback(async () => {
    if (busy.current || blocked.current || !initialized.current) return;
    busy.current = true;
    try {
      if (!connected.current) {
        try {
          const collection = await loadRemote();
          const remote = collection.saves.find((r) => r.record.id === session.id);
          if (owner.current && owner.current !== collection.profileId) {
            conflict();
            return;
          }
          owner.current = collection.profileId;
          if ((remote?.revision ?? 0) !== revision.current) {
            conflict();
            return;
          }
          connected.current = true;
        } catch {
          warn("Server save is pending. Your local copy is kept; reconnect to sync.");
          return;
        }
      }
      while (queue.current && !blocked.current) {
        const record = queue.current;
        const pending = { ...record, baseRevision: revision.current, pending: true };
        if (mounted.current) local(pending);
        try {
          const response = await api("/api/progress", "PUT", {
            record: pending,
            profileId: owner.current,
            expectedRevision: revision.current,
            mutationId: pending.mutationId,
          });
          revision.current = response.revision;
          if (queue.current === record) {
            queue.current = null;
            if (mounted.current)
              local({
                ...response.record,
                baseRevision: response.revision,
                profileId: owner.current,
                pending: false,
              });
          }
          warn(
            storageFailed.current
              ? "Browser storage is unavailable. Your progress is saved on the server."
              : "",
          );
        } catch (error) {
          if (
            error instanceof SyncError &&
            (error.status === 409 || error.status === 422 || error.status === 401)
          )
            conflict();
          else warn("Server save is pending. Your local copy is kept; reconnect to sync.");
          break;
        }
      }
    } finally {
      busy.current = false;
    }
  }, [local, conflict, warn, session.id]);
  const saveNow = useCallback(
    (value: T) => {
      if (!initialized.current || blocked.current) return;
      const descriptionValue = description.current(value);
      const record = {
        ...makeRecord(session, value, descriptionValue.completed, descriptionValue.summary),
        baseRevision: revision.current,
        profileId: owner.current,
        pending: true,
        mutationId: resumedMutation.current ?? crypto.randomUUID(),
      };
      resumedMutation.current = undefined;
      queue.current = record;
      local(record);
      void flush();
    },
    [session, local, flush],
  );
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function load() {
      let saved: SavedRecord | undefined;
      try {
        saved = readRecords(localStorage).find((r) => r.id === session.id);
      } catch {
        warn("Browser storage is unavailable. Loading server progress.");
      }
      try {
        const collection = await loadRemote();
        const remote = collection.saves.find((r) => r.record.id === session.id);
        if (owner.current && owner.current !== collection.profileId) {
          conflict();
          return;
        }
        owner.current = collection.profileId;
        if (cancelled) return;
        if (saved?.profileId && saved.profileId !== owner.current) {
          conflict();
          return;
        }
        revision.current = remote?.revision ?? 0;
        connected.current = true;
        if (
          saved?.pending &&
          saved.mutationId !== remote?.mutationId &&
          (saved.baseRevision ?? 0) !== revision.current
        ) {
          conflict();
          return;
        }
        if (remote && (!saved?.pending || saved.mutationId === remote.mutationId))
          saved = {
            ...remote.record,
            baseRevision: remote.revision,
            profileId: owner.current,
            pending: false,
          };
      } catch {
        warn(
          "Server progress is unavailable. Playing from this browser’s copy; changes will sync when connected.",
        );
        revision.current = saved?.baseRevision ?? 0;
        owner.current = saved?.profileId;
      }
      if (cancelled) return;
      if (saved) {
        const restored = validator.current(saved.state);
        if (restored) {
          setState(restored);
          resumedMutation.current = saved.pending ? saved.mutationId : undefined;
        } else {
          warn("This save could not be restored. It has been kept for recovery.");
          conflict();
          return;
        }
      }
      initialized.current = true;
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [session.id, conflict, warn]);
  useEffect(() => {
    if (ready) saveNow(state);
  }, [ready, state, saveNow]);
  useEffect(() => {
    const retry = () => {
      void flush();
    };
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 30000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [flush]);
  return { state, setState, ready, warning, saveNow };
}
