"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Result, SaveNotice } from "../../../components/game-shared";
import { useSavedGame } from "../../../components/use-saved-game";
import type { Session } from "../../registry";
import { type Cell, createPuzzle, cycle, isSolved, totals } from "./engine";

const cells = z.array(z.union([z.literal(-1), z.literal(0), z.literal(1)])).length(25);
const schema = z.object({
  cells,
  history: z.array(cells).max(100),
  moves: z.number().int().nonnegative(),
  hints: z.number().int().nonnegative(),
});
export default function Signal({ session }: { session: Session }) {
  const puzzle = useMemo(() => createPuzzle(session.seed), [session.seed]);
  const { state, setState, ready, warning } = useSavedGame(
    session,
    { cells: puzzle.givens, history: [] as Cell[][], moves: 0, hints: 0 },
    (value) => {
      const parsed = schema.safeParse(value);
      if (
        !parsed.success ||
        ![parsed.data.cells, ...parsed.data.history].every((board) =>
          board.every((v, i) => puzzle.givens[i] === -1 || puzzle.givens[i] === v),
        )
      )
        return null;
      return parsed.data;
    },
    (s) => ({
      completed: isSolved(s.cells, puzzle),
      summary: `${s.moves} moves · ${s.hints} reveals`,
    }),
  );
  const [message, setMessage] = useState("Start with a row that already has all its circles.");
  if (!ready) return <p className="loading">Preparing your grid…</p>;
  const solved = isSolved(state.cells, puzzle),
    counts = totals(state.cells);
  const marked = state.cells.filter((v, i) => v !== -1 && puzzle.givens[i] === -1).length,
    open = puzzle.givens.filter((v) => v === -1).length;
  function change(i: number, value: Cell, hint = false) {
    setState((s) => ({
      cells: s.cells.map((v, j) => (i === j ? value : v)),
      history: [...s.history.slice(-99), s.cells],
      moves: s.moves + (hint ? 0 : 1),
      hints: s.hints + (hint ? 1 : 0),
    }));
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
            <fieldset className="signal-board" aria-label="Signal Grid puzzle">
              <span />
              {puzzle.columns.map((n, c) => (
                <span
                  role="img"
                  key={`col-${c}`}
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
            <div className="actions centered">
              <button
                type="button"
                className="button secondary"
                disabled={!state.history.length}
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    cells: s.history.at(-1) ?? s.cells,
                    history: s.history.slice(0, -1),
                  }));
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
