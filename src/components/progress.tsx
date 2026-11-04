"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { games } from "../games/registry";
import { readRecords, type SavedRecord } from "../lib/persistence";
export function Progress() {
  const [records, setRecords] = useState<SavedRecord[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    try {
      setRecords(readRecords(localStorage));
    } catch {
      setError(true);
    }
    setReady(true);
  }, []);
  if (!ready) return <p className="loading">Opening your collection…</p>;
  return (
    <>
      {error && (
        <p className="notice" role="status">
          Storage is unavailable in this browser. Your games still work, but progress cannot be
          kept.
        </p>
      )}
      <div className="progress-overview">
        <div>
          <span className="big-number">{records.filter((r) => r.completed).length}</span>
          <span>completed rounds in your recent history</span>
        </div>
        <p>
          Up to 60 recent sessions stay on this device. Clearing browser data removes them. No cloud
          sync is enabled.
        </p>
      </div>
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
              <Link
                className="button secondary"
                href={`/play/${record.game}?${record.mode === "daily" ? `date=${encodeURIComponent(record.id.split(":")[3] ?? "")}` : `mode=practice&seed=${encodeURIComponent(record.id.split(":")[3] ?? "")}`}${record.id.endsWith(":calm") ? "&pace=calm" : ""}`}
              >
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
