"use client";
import { useState } from "react";
import { clearRecords, readRecords } from "../lib/persistence";
import { api, downloadRecords } from "../lib/progress-client";
export function Recovery() {
  const [code, setCode] = useState(""),
    [input, setInput] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch {
      setMessage(
        "That request could not be completed. Check your connection or recovery code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="prose">
      <h2>Keep your progress safe.</h2>
      <p>
        Your last 60 sessions are saved on this server and cached in your browser. A recovery code
        opens your profile on another browser if cookies are lost. Keep it private: anyone with the
        code can access your progress. Each code works once; generating a new one replaces the
        previous code.
      </p>
      <div className="actions">
        <button
          type="button"
          disabled={busy}
          className="button secondary"
          onClick={() =>
            void run(async () => {
              const result = await api("/api/recovery", "POST", { action: "create" });
              setCode(result.code);
            })
          }
        >
          Create recovery code
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => void run(async () => downloadRecords(readRecords(localStorage)))}
        >
          Export progress
        </button>
      </div>
      {code && (
        <label>
          Save this recovery code
          <textarea readOnly value={code} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <details>
        <summary>Restore another profile</summary>
        <p>
          Export any unsynced progress first. Restoring replaces this browser’s cached history with
          the recovered profile. The code is consumed when restoration succeeds.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api("/api/recovery", "POST", { action: "restore", code: input.trim() });
              try {
                clearRecords(localStorage);
              } catch {
                /* No accessible cache to clear. */
              }
              location.reload();
            });
          }}
        >
          <label>
            Recovery code
            <input
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              minLength={43}
              maxLength={43}
            />
          </label>
          <button type="submit" className="button primary" disabled={busy}>
            Restore profile
          </button>
        </form>
      </details>
      <details>
        <summary>Delete your profile</summary>
        <p>
          This permanently deletes server progress, recovery codes and sessions. Download an export
          first if needed.
        </p>
        <label>
          <input
            type="checkbox"
            checked={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.checked)}
          />{" "}
          Delete my saved progress from this server and browser
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={busy || !confirmDelete}
          onClick={() =>
            void run(async () => {
              await api("/api/profile", "DELETE", {});
              try {
                clearRecords(localStorage);
              } catch {
                /* No accessible cache to clear. */
              }
              location.href = "/";
            })
          }
        >
          Delete profile
        </button>
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
