"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { games, sessionFromId, sessionHref } from "../games/registry";
import { readAllRecords, type SavedRecord } from "../lib/persistence";
import { loadRemote } from "../lib/progress-client";
import { progressView, type RemoteProgress } from "../lib/progress-view";
import { Recovery } from "./recovery";
export function Progress() {
  const [records, setRecords] = useState<SavedRecord[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const remote = useRef<RemoteProgress>({ saves: [], profileId: "" });
  function exportRecords() {
    return progressView(readAllRecords(localStorage), remote.current);
  }
  useEffect(() => {
    let cancelled = false,
      generation = 0;
    function render() {
      if (cancelled) return;
      let local: SavedRecord[] = [];
      try {
        local = readAllRecords(localStorage);
      } catch {
        setError(true);
      }
      setRecords(progressView(local, remote.current).slice(0, 60));
    }
    async function load() {
      const request = ++generation;
      try {
        const result = await loadRemote();
        if (cancelled || request !== generation) return;
        remote.current = result;
      } catch {
        if (!cancelled && request === generation) setError(true);
      }
      if (!cancelled && request === generation) {
        render();
        setReady(true);
      }
    }
    // No cache writes: a late server response cannot acknowledge or replace another tab's edits.
    render();
    void load();
    const refresh = () => render(),
      focus = () => void load();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", focus);
    return () => {
      cancelled = true;
      generation++;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", focus);
    };
  }, []);
  if (!ready) return <p className="loading">Opening your collection…</p>;
  return (
    <>
      {error && (
        <p className="notice" role="status">
          Some progress could not be loaded or cached. Your available records are shown below.
        </p>
      )}
      <div className="progress-overview">
        <div>
          <span className="big-number">{records.filter((r) => r.completed).length}</span>
          <span>completed rounds in your recent history</span>
        </div>
        <p>
          Up to 60 recent sessions are saved on this server. Keep a recovery code to restore access
          if browser cookies are cleared.
        </p>
      </div>
      <Recovery exportRecords={exportRecords} />
      {records.length ? (
        <div className="history-list">
          {records.map((record) => (
            <article key={record.id}>
              <div>
                <span className="eyebrow">
                  {record.mode} · {record.label}
                </span>
                <h2>{games.find((g) => g.id === record.game)?.name}</h2>
                <p>{record.completed ? record.summary : "In progress · ready when you are"}</p>
              </div>
              <Link className="button secondary" href={resumeHref(record.id)}>
                {record.completed ? "View result" : "Continue"} →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">✳</span>
          <h2>Your first little victory awaits.</h2>
          <p>Finish any game and it will appear here.</p>
          <Link className="button primary" href="/">
            Find your game →
          </Link>
        </div>
      )}
    </>
  );
}

function resumeHref(id: string) {
  const session = sessionFromId(id);
  return session ? sessionHref(session) : "/progress";
}
