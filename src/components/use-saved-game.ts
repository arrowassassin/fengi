"use client";
import { useEffect, useRef, useState } from "react";
import type { Session } from "../games/registry";
import { makeRecord, readRecords, saveRecord } from "../lib/persistence";

/** Mount per session key. Hydration never overwrites an existing snapshot with defaults. */
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
  useEffect(() => {
    try {
      const saved = readRecords(window.localStorage).find((r) => r.id === session.id);
      if (saved) {
        const restored = validator.current(saved.state);
        if (restored) setState(restored);
        else setWarning("This older save could not be restored. A fresh round is ready.");
      }
    } catch {
      setWarning(
        "Browser storage is unavailable. You can play, but progress will not survive a reload.",
      );
    }
    setReady(true);
  }, [session.id]);
  useEffect(() => {
    if (!ready) return;
    const { completed, summary } = description.current(state);
    try {
      saveRecord(window.localStorage, makeRecord(session, state, completed, summary));
    } catch {
      setWarning(
        "Progress could not be saved on this device. Keep this tab open to finish your round.",
      );
    }
  }, [ready, state, session]);
  return { state, setState, ready, warning };
}
