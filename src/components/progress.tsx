"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { games, sessionFromId, sessionHref } from "../games/registry";
import { readRecords, type SavedRecord, saveRecord } from "../lib/persistence";
import { loadRemote } from "../lib/progress-client";
import { Recovery } from "./recovery";
export function Progress() {
  const [records, setRecords] = useState<SavedRecord[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let local: SavedRecord[] = [];
      try {
        local = readRecords(localStorage);
      } catch {
        setError(true);
      }
      try {
        const { saves: remote, profileId } = await loadRemote();
        const merged = remote.map((item) => {
          const pending = local.find((r) => r.id === item.record.id && r.pending);
          const record = pending ?? {
            ...item.record,
            baseRevision: item.revision,
            profileId,
            pending: false,
          };
          try {
            saveRecord(localStorage, record);
          } catch {
            setError(true);
          }
          return record;
        });
        local = [...merged, ...local.filter((r) => !merged.some((m) => m.id === r.id))];
      } catch {
        setError(true);
      }
      if (!cancelled) {
        setRecords(local);
        setReady(true);
      }
    }
    void load();
    const refresh = () => void load();
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", refresh);
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
      <Recovery />
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
