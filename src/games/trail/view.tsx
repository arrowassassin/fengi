"use client";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Result, SaveNotice } from "../../components/game-shared";
import { useSavedGame } from "../../components/use-saved-game";
import type { Session } from "../registry";
import { createGarden, neighbors, pathMask, validPath } from "./engine";

const schema = z.object({ path: z.array(z.number().int().min(0).max(35)).min(1).max(1001) });
export default function Trail({ session }: { session: Session }) {
  const garden = useMemo(() => createGarden(session.seed), [session.seed]);
  const { state, setState, ready, warning } = useSavedGame(
    session,
    { path: [0] },
    (value) => {
      const parsed = schema.safeParse(value);
      return parsed.success && validPath(parsed.data.path, garden) ? parsed.data : null;
    },
    (s) => ({
      completed: s.path.at(-1) === 35 && pathMask(s.path, garden.seeds) === 7,
      summary: `${s.path.length - 1} moves · optimal ${garden.optimum}`,
    }),
  );
  const [message, setMessage] = useState("Gather all three seeds before reaching the exit.");
  if (!ready) return <p className="loading">Growing your garden…</p>;
  const current = state.path.at(-1) ?? 0,
    mask = pathMask(state.path, garden.seeds),
    complete = current === 35 && mask === 7;
  function move(to: number) {
    if (
      neighbors(current).includes(to) &&
      !garden.walls.includes(to) &&
      state.path.length <= 1000
    ) {
      setState((s) => ({ path: [...s.path, to] }));
      setMessage(
        to === 35 && mask !== 7
          ? "The exit is here, but some seeds are still in the garden."
          : "Retracing is allowed. Look for a route that gathers all three.",
      );
    }
  }
  return (
    <>
      <SaveNotice warning={warning} />
      {complete ? (
        <Result
          session={session}
          title="Trail Trace"
          summary={`${state.path.length - 1} moves · shortest route ${garden.optimum}`}
        >
          <p>
            {state.path.length - 1 === garden.optimum
              ? "Perfect route. Every step counted."
              : "All three seeds made it home. Another route may be shorter."}
          </p>
        </Result>
      ) : (
        <div className="play-layout">
          <div className="game-intro">
            <span className="eyebrow">A small garden of possibilities</span>
            <h2>Take the clever path.</h2>
            <p>
              Collect three seeds ✿ and reach the exit ⌂. Move up, down, left or right. Dark hedges
              block the way.
            </p>
            <details className="rules">
              <summary>Controls and goals</summary>
              <p>
                Tap a neighboring square, use the arrow buttons, or focus the board and use your
                keyboard’s arrow keys. Retracing is allowed. Undo restores both your path and
                collected seeds.
              </p>
            </details>
            <p className="stat-line">
              {state.path.length - 1} moves <span>·</span>{" "}
              {[0, 1, 2].filter((i) => mask & (1 << i)).length}/3 seeds
            </p>
          </div>
          <div className="board-area">
            <fieldset
              className="trail-board"
              aria-label="Garden board"
              onKeyDown={(event) => {
                const delta = { ArrowUp: -6, ArrowDown: 6, ArrowLeft: -1, ArrowRight: 1 }[
                  event.key
                ];
                if (delta !== undefined) {
                  event.preventDefault();
                  move(current + delta);
                }
              }}
            >
              {Array.from({ length: 36 }, (_, i) => {
                const seedIndex = garden.seeds.indexOf(i),
                  collected = seedIndex >= 0 && !!(mask & (1 << seedIndex)),
                  wall = garden.walls.includes(i);
                return (
                  <button
                    type="button"
                    key={`garden-${i}`}
                    data-garden-cell={i}
                    className={`garden-cell ${wall ? "hedge" : ""} ${i === current ? "player" : ""} ${state.path.includes(i) ? "visited" : ""}`}
                    disabled={wall}
                    onClick={() => move(i)}
                    aria-label={`Row ${Math.floor(i / 6) + 1}, column ${(i % 6) + 1}${wall ? ", hedge" : i === current ? ", you are here" : i === 35 ? ", exit" : seedIndex >= 0 ? (collected ? ", seed collected" : ", seed") : ""}`}
                  >
                    {wall
                      ? "▥"
                      : i === current
                        ? "●"
                        : i === 35
                          ? "⌂"
                          : seedIndex >= 0 && !collected
                            ? "✿"
                            : i === 0
                              ? "○"
                              : ""}
                  </button>
                );
              })}
            </fieldset>
            <fieldset className="direction-pad" aria-label="Movement">
              <button type="button" aria-label="Move left" onClick={() => move(current - 1)}>
                ←
              </button>
              <button type="button" aria-label="Move up" onClick={() => move(current - 6)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" onClick={() => move(current + 6)}>
                ↓
              </button>
              <button type="button" aria-label="Move right" onClick={() => move(current + 1)}>
                →
              </button>
            </fieldset>
            <div className="actions centered">
              <button
                type="button"
                className="button secondary"
                disabled={state.path.length === 1}
                onClick={() => setState((s) => ({ path: s.path.slice(0, -1) }))}
              >
                Undo step
              </button>
              <button
                type="button"
                className="button text"
                onClick={() => {
                  setState({ path: [0] });
                  setMessage("Back at the entrance. Try a different route.");
                }}
              >
                Start over
              </button>
            </div>
            <p className="feedback" role="status">
              {state.path.length > 1000
                ? "Move limit reached. Undo a step or start over."
                : message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
