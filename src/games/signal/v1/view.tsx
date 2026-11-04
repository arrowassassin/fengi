"use client";
import { useMemo, useState } from "react";
import { Result, SaveNotice } from "../../../components/game-shared";
import type { Session } from "../../registry";
import { signalGame } from "../../releases/definitions-v1";
import { PhaserSurface } from "../../runtime/phaser-surface";
import { useGameSession } from "../../runtime/use-game-session";
import { type Cell, createPuzzle, cycle, isSolved, totals } from "./engine";

export default function Signal({ session }: { session: Session }) {
  const puzzle = useMemo(() => createPuzzle(session.seed), [session.seed]);
  const { state, dispatch, ready, warning } = useGameSession(signalGame, session);
  const [message, setMessage] = useState("Start with a row that already has all its circles.");
  if (!ready) return <p className="loading">Preparing your grid…</p>;
  const solved = isSolved(state.cells, puzzle),
    counts = totals(state.cells);
  const marked = state.cells.filter((v, i) => v !== -1 && puzzle.givens[i] === -1).length,
    open = puzzle.givens.filter((v) => v === -1).length;
  function change(i: number, value: Cell, hint = false) {
    dispatch({ type: hint ? "reveal" : "cycle", index: i });
    setMessage(
      hint
        ? `Revealed row ${Math.floor(i / 5) + 1}, column ${(i % 5) + 1}: ${value === 1 ? "circle" : "cross"}.`
        : "Match the counts. Every tile can be changed or undone.",
    );
  }
  return (
    <>
      <SaveNotice warning={warning} />
      {solved ? (
        <Result
          session={session}
          title="Signal Grid"
          summary={`${state.moves} moves · ${state.hints} revealed tiles`}
        >
          <div className="mini-grid" aria-hidden="true">
            {state.cells.map((v, i) => (
              <span key={`result-${i}`} className={v === 1 ? "filled" : ""} />
            ))}
          </div>
        </Result>
      ) : (
        <div className="play-layout">
          <div className="game-intro">
            <span className="eyebrow">A little logic goes a long way</span>
            <h2>Everything clicks.</h2>
            <p>
              Fill each square with a circle or cross. Numbers tell you how many circles belong in
              each row and column.
            </p>
            <details className="rules">
              <summary>How to play</summary>
              <ol>
                <li>Tap a tile: blank → circle → cross.</li>
                <li>Match every row and column total.</li>
                <li>Dotted tiles are fixed clues. No timer.</li>
              </ol>
            </details>
            <p className="small muted">
              {marked} of {open} open tiles marked
            </p>
            <progress value={marked} max={open} aria-label="Marked tiles" />
          </div>
          <div className="board-area">
            <PhaserSurface
              game="signal"
              picture={{
                nodes: [
                  ...state.cells.map((value, index) => ({
                    id: `signal-${index}`,
                    text: value === 1 ? "●" : value === 0 ? "×" : "",
                    fill: value === 1 ? "--blue" : value === 0 ? "--bluewash" : "--panel",
                    color: value === 1 ? "--paper" : "--blue",
                    fixed: puzzle.givens[index] !== -1,
                  })),
                  ...puzzle.columns.map((n, i) => ({
                    id: `col-${i}`,
                    text: String(n),
                    color:
                      counts.columns[i] === n
                        ? "--blue"
                        : counts.columns[i] > n
                          ? "--danger"
                          : "--muted",
                    shape: "text" as const,
                  })),
                  ...puzzle.rows.map((n, i) => ({
                    id: `row-${i}`,
                    text: String(n),
                    color:
                      counts.rows[i] === n ? "--blue" : counts.rows[i] > n ? "--danger" : "--muted",
                    shape: "text" as const,
                  })),
                ],
              }}
            >
              <fieldset className="signal-board" aria-label="Signal Grid puzzle">
                <span />
                {puzzle.columns.map((n, c) => (
                  <span
                    role="img"
                    key={`col-${c}`}
                    data-scene-id={`col-${c}`}
                    className={`clue ${counts.columns[c] === n ? "matched" : ""} ${counts.columns[c] > n ? "over" : ""}`}
                    aria-label={`Column ${c + 1}: ${counts.columns[c]} of ${n} circles`}
                  >
                    {n}
                  </span>
                ))}
                {puzzle.rows.map((n, r) => (
                  <div className="grid-row" key={`row-${r}`}>
                    <span
                      role="img"
                      data-scene-id={`row-${r}`}
                      className={`clue ${counts.rows[r] === n ? "matched" : ""} ${counts.rows[r] > n ? "over" : ""}`}
                      aria-label={`Row ${r + 1}: ${counts.rows[r]} of ${n} circles`}
                    >
                      {n}
                    </span>
                    {state.cells.slice(r * 5, r * 5 + 5).map((v, c) => {
                      const i = r * 5 + c;
                      return (
                        <button
                          type="button"
                          key={`cell-${i}`}
                          data-cell={i}
                          data-scene-id={`signal-${i}`}
                          data-state={v}
                          className={`signal-tile ${puzzle.givens[i] !== -1 ? "fixed" : ""}`}
                          disabled={puzzle.givens[i] !== -1}
                          onClick={() => change(i, cycle(v))}
                          aria-label={`Row ${r + 1}, column ${c + 1}: ${v === 1 ? "circle" : v === 0 ? "cross" : "blank"}${puzzle.givens[i] !== -1 ? ", fixed" : ""}`}
                        >
                          {v === 1 ? "●" : v === 0 ? "×" : ""}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </fieldset>
            </PhaserSurface>
            <div className="actions centered">
              <button
                type="button"
                className="button secondary"
                disabled={!state.history.length}
                onClick={() => {
                  dispatch({ type: "undo" });
                  setMessage("Last change undone.");
                }}
              >
                Undo
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  const i = state.cells.findIndex((v, i) => v !== puzzle.solution[i]);
                  if (i >= 0) change(i, puzzle.solution[i], true);
                }}
              >
                Reveal a tile
              </button>
            </div>
            <p className="feedback" role="status">
              {state.cells.every((v) => v !== -1)
                ? "All tiles marked. A count still needs a change."
                : message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
