"use client";
import { useState } from "react";
import { neighbors, shortestRoute } from "../games/trail/engine";
export function ReviewedGarden({ garden }: { garden: { walls: number[]; seeds: number[] } }) {
  const [path, setPath] = useState([0]);
  const current = path[path.length - 1],
    collected = garden.seeds.filter((c) => path.includes(c)).length;
  const complete = current === 35 && collected === 3;
  const optimum = (shortestRoute(garden.walls, garden.seeds)?.length || 1) - 1;
  return (
    <section>
      <p>
        Collect all three seeds, then reach cell 36. Choose an adjacent square; retracing is
        allowed.
      </p>
      <p role="status">
        {complete
          ? `Garden complete! ${path.length - 1} moves; shortest route ${optimum}.`
          : `${collected}/3 seeds · ${path.length - 1} moves`}
      </p>
      <div
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
            disabled={complete || garden.walls.includes(cell) || !neighbors(current).includes(cell)}
            onClick={() => setPath([...path, cell])}
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
      </div>
      <button type="button" className="button secondary" onClick={() => setPath([0])}>
        Restart garden
      </button>
      <p className="small">
        Reviewed AI route challenge · local session only; reloading resets this garden. No ranked
        score or server save.
      </p>
    </section>
  );
}
