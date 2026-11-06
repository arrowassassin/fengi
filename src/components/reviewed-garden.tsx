"use client";
import { describeGarden, gardenState } from "../games/garden-state";
import type { Session } from "../games/registry";
import { neighbors, shortestRoute } from "../games/trail/engine";
import { useSavedGame } from "./use-saved-game";
export function ReviewedGarden({
  garden,
  session,
}: {
  garden: { walls: number[]; seeds: number[] };
  session: Session;
}) {
  const saved = useSavedGame(
    session,
    { version: 1 as const, path: [0] },
    (value) => {
      try {
        return gardenState(garden, value);
      } catch {
        return null;
      }
    },
    (state) => describeGarden(garden, state),
  );
  const path = saved.state.path;
  const setPath = (path: number[]) => saved.setState({ version: 1, path });
  if (!saved.ready)
    return (
      <p className="loading" role="status">
        Loading saved garden…
      </p>
    );
  const current = path[path.length - 1],
    collected = garden.seeds.filter((c) => path.includes(c)).length;
  const complete = current === 35 && collected === 3;
  const optimum = (shortestRoute(garden.walls, garden.seeds)?.length || 1) - 1;
  return (
    <section className="reviewed-garden">
      {saved.warning && <p role="alert">{saved.warning}</p>}
      <p>
        Collect all three seeds, then reach cell 36. Choose an adjacent square or use arrow keys;
        retracing is allowed.
      </p>
      <p role="status">
        {complete
          ? `Garden complete! ${path.length - 1} moves; shortest route ${optimum}.`
          : `${collected}/3 seeds · ${path.length - 1} moves`}
      </p>
      {path.length >= 2000 && (
        <p role="alert">Move limit reached. Restart this garden to play again.</p>
      )}
      <fieldset
        className="reviewed-garden-board"
        aria-label="Generated garden board"
        tabIndex={-1}
        onKeyDown={(event) => {
          const delta = { ArrowUp: -6, ArrowDown: 6, ArrowLeft: -1, ArrowRight: 1 }[event.key];
          if (delta !== undefined) {
            event.preventDefault();
            // Keep arrows on a stable target when a move disables the former cell.
            event.currentTarget.focus();
            const to = current + delta;
            if (
              !complete &&
              path.length < 2000 &&
              neighbors(current).includes(to) &&
              !garden.walls.includes(to)
            )
              setPath([...path, to]);
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,minmax(0,1fr))",
          gap: 4,
          maxWidth: 420,
        }}
      >
        {Array.from({ length: 36 }, (_, cell) => cell).map((cell) => (
          <button
            key={cell}
            type="button"
            aria-label={`Cell ${cell + 1}${garden.walls.includes(cell) ? ", wall" : ""}${garden.seeds.includes(cell) ? ", seed" : ""}${current === cell ? ", current" : ""}${cell === 35 ? ", exit" : ""}`}
            disabled={
              path.length >= 2000 ||
              complete ||
              garden.walls.includes(cell) ||
              !neighbors(current).includes(cell)
            }
            onClick={(event) => {
              event.currentTarget.parentElement?.focus();
              setPath([...path, cell]);
            }}
            style={{
              minHeight: 44,
              border: "1px solid var(--ink)",
              background: current === cell ? "var(--blue)" : "var(--panel)",
            }}
          >
            {garden.walls.includes(cell)
              ? "■"
              : current === cell
                ? "●"
                : garden.seeds.includes(cell)
                  ? "✦"
                  : cell === 35
                    ? "Exit"
                    : cell + 1}
          </button>
        ))}
      </fieldset>
      <button
        type="button"
        className="button secondary"
        disabled={path.length <= 1}
        onClick={() => setPath(path.slice(0, -1))}
      >
        Undo step
      </button>
      <button type="button" className="button secondary" onClick={() => setPath([0])}>
        Restart garden
      </button>
      <p className="small">
        Reviewed AI route challenge · progress saves and resumes. No ranked score.
      </p>
    </section>
  );
}
