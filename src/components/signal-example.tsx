"use client";
import { useState } from "react";
import { type Cell, cycle } from "../games/signal/v1/engine";
export function SignalExample() {
  const [cell, setCell] = useState<Cell>(-1);
  return (
    <div className="signal-example">
      <strong>Try a tiny row · goal: 2 circles</strong>
      <div className="signal-example-row">
        <span role="img" aria-label="Fixed circle">
          ●
        </span>
        <button
          type="button"
          aria-label={`Example tile: ${cell === -1 ? "blank" : cell === 1 ? "circle" : "cross"}. Tap to change.`}
          onClick={() => setCell(cycle(cell))}
        >
          {cell === 1 ? "●" : cell === 0 ? "×" : "?"}
        </button>
        <span role="img" aria-label="Fixed cross">
          ×
        </span>
      </div>
      <p role="status">
        {cell === 1
          ? "2/2 circles ✓ Count matched. Every square is filled."
          : "1/2 circles. Tap the middle tile to make a circle. Crosses don’t count toward the total."}
      </p>
    </div>
  );
}
