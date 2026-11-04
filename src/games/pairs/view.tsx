"use client";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Result, SaveNotice } from "../../components/game-shared";
import { useSavedGame } from "../../components/use-saved-game";
import type { Session } from "../registry";
import { createDeck, isPair, symbolNames, symbols } from "./engine";

const schema = z.object({
  matched: z.array(z.number().int().min(0).max(15)).max(16),
  turns: z.number().int().nonnegative(),
});
export default function Pairs({ session }: { session: Session }) {
  const deck = useMemo(() => createDeck(session.seed), [session.seed]);
  const { state, setState, ready, warning } = useSavedGame(
    session,
    { matched: [] as number[], turns: 0 },
    (value) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) return null;
      const m = parsed.data.matched;
      return new Set(m).size === m.length &&
        m.length % 2 === 0 &&
        m.every((i) => m.filter((j) => deck[j] === deck[i]).length === 2) &&
        parsed.data.turns >= m.length / 2
        ? parsed.data
        : null;
    },
    (s) => ({ completed: s.matched.length === 16, summary: `${s.turns} turns · 8 pairs` }),
  );
  const [flipped, setFlipped] = useState<number[]>([]),
    [message, setMessage] = useState("Pick two cards. Find what belongs together.");
  useEffect(() => {
    if (flipped.length !== 2) return;
    const timer = setTimeout(() => setFlipped([]), 900);
    return () => clearTimeout(timer);
  }, [flipped]);
  if (!ready) return <p className="loading">Shuffling the flowers…</p>;
  function flip(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || state.matched.includes(index)) return;
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      const match = isPair(deck, next[0], next[1]);
      setState((s) => ({
        matched: match ? [...s.matched, ...next] : s.matched,
        turns: s.turns + 1,
      }));
      setMessage(
        match
          ? `A pair of ${symbolNames[deck[index]]}s. Lovely.`
          : "Not a match. Remember those positions.",
      );
    }
  }
  return (
    <>
      <SaveNotice warning={warning} />
      {state.matched.length === 16 ? (
        <Result
          session={session}
          title="Pair Bloom"
          summary={`${state.turns} turns · all 8 pairs found`}
        >
          <p>
            {state.turns === 8
              ? "A perfect memory. Eight turns, eight pairs."
              : "A whole garden, brought together."}
          </p>
        </Result>
      ) : (
        <div className="play-layout">
          <div className="game-intro">
            <span className="eyebrow">Give your attention somewhere lovely</span>
            <h2>Good things come in pairs.</h2>
            <p>
              Reveal two cards. A match stays open; a mismatch turns back. Find all eight pairs, at
              your own pace.
            </p>
            <p className="stat-line">
              {state.matched.length / 2}/8 pairs <span>·</span> {state.turns} turns
            </p>
            <details className="rules">
              <summary>How to play</summary>
              <p>
                Tap a card or use Tab and Enter. Mismatches stay visible for a moment. There’s no
                timer. Reloading preserves matched pairs and turns; unfinished selections turn
                face-down.
              </p>
            </details>
          </div>
          <div className="board-area">
            <div className="pairs-board">
              {deck.map((symbol, index) => {
                const matched = state.matched.includes(index),
                  visible = matched || flipped.includes(index);
                return (
                  <button
                    type="button"
                    key={`card-${index}`}
                    data-card={index}
                    className={`pair-card ${visible ? "revealed" : ""} ${matched ? "paired" : ""}`}
                    disabled={matched}
                    onClick={() => flip(index)}
                    aria-label={`Card ${index + 1}: ${visible ? symbolNames[symbol] : "face down"}${matched ? ", matched" : ""}`}
                    aria-pressed={visible}
                  >
                    <span aria-hidden="true">{visible ? symbols[symbol] : "✳"}</span>
                  </button>
                );
              })}
            </div>
            <p className="feedback" role="status">
              {message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
