"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { games, sessionFor, sessionFromId, sessionHref } from "../games/registry";
import { readAllRecords, type SavedRecord } from "../lib/persistence";
import { GameArt } from "./game-art";
export function GameShelf({ date }: { date: string }) {
  const [records, setRecords] = useState<SavedRecord[]>([]),
    [filter, setFilter] = useState("All games");
  useEffect(() => {
    const refresh = () => {
      try {
        setRecords(readAllRecords(localStorage));
      } catch {
        /* Optional shelf hints never block play. */
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const latest = records.find((r) => !r.completed && sessionFromId(r.id));
  const filters = ["All games", "Think", "React", "Remember"];
  const shown = games.filter(
    (g) =>
      filter === "All games" ||
      (filter === "Think"
        ? ["signal", "odd", "trail"].includes(g.id)
        : filter === "React"
          ? g.id === "orbit"
          : g.id === "pairs"),
  );
  return (
    <section className="daily-shelf" aria-labelledby="daily-title">
      {latest && (
        <div className="resume-strip">
          <span className="resume-icon" aria-hidden="true">
            ↳
          </span>
          <div>
            <strong>Pick up where you left off</strong>
            <span>
              {games.find((g) => g.id === latest.game)?.name} ·{" "}
              {latest.mode === "daily" ? "Daily edition" : "Practice"}
            </span>
          </div>
          <Link
            className="button secondary"
            href={sessionHref(sessionFromId(latest.id) as ReturnType<typeof sessionFor>)}
          >
            Resume game <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
      <div className="shelf-heading">
        <div>
          <p className="eyebrow">A little challenge. A fresh start.</p>
          <h2 id="daily-title">
            Your daily five<span className="title-dot">.</span>
          </h2>
        </div>
        <p className="small muted">New editions every day · No streak pressure</p>
      </div>
      <fieldset className="shelf-filters" aria-label="Choose a kind of game">
        {filters.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </fieldset>
      <div className="lobby-grid">
        {shown.map((g) => {
          const session = sessionFor(g.id, new URLSearchParams({ date })),
            saved = records.find((r) => r.id === session.id),
            status = saved ? (saved.completed ? "Completed" : "In progress") : "Daily edition";
          return (
            <Link
              key={g.id}
              className={`game-card lobby-card tone-${g.color}`}
              href={sessionHref(session)}
              aria-label={`${g.name} · ${saved?.completed ? "View result" : saved ? "Resume" : "Play"}`}
            >
              <div className="lobby-art">
                <span className="card-number" aria-hidden="true">
                  0{games.findIndex((game) => game.id === g.id) + 1}
                </span>
                <GameArt game={g.id} />
                <span className={`card-status ${saved ? "has-progress" : ""}`}>
                  {saved?.completed ? "✓ " : saved ? "↳ " : ""}
                  {status}
                </span>
              </div>
              <div className="lobby-card-copy">
                <div className="card-meta">
                  <span>{g.category}</span>
                  <span>{g.time}</span>
                </div>
                <h3>{g.name}</h3>
                <p>{g.description}</p>
                <span className="card-action">
                  {saved?.completed ? "View result" : saved ? "Resume game" : "Let’s play"}
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 16 16" fill="none">
                    <path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="shelf-note">
        Progress labels reflect this browser’s saved copy.{" "}
        <Link href="/progress">View all progress and recovery options →</Link>
      </p>
    </section>
  );
}
