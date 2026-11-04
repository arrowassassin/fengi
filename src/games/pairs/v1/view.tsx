"use client";
import { useMemo, useRef, useState } from "react";
import { Result, SaveNotice } from "../../../components/game-shared";
import type { GeneratedPack } from "../../generated-content";
import { pairDefinition } from "../../generated-definitions";
import type { Session } from "../../registry";
import { pairGame } from "../../releases/definitions-v1";
import { PhaserSurface } from "../../runtime/phaser-surface";
import { useGameSession } from "../../runtime/use-game-session";
import { createDeck, isPair, symbolNames, symbols } from "./engine";

export default function Pairs({
  session,
  content,
}: {
  session: Session;
  content?: GeneratedPack["pairs"];
}) {
  const definition = useMemo(() => (content ? pairDefinition(content) : pairGame), [content]);
  const deck = useMemo(
    () => (content ? content.deck : createDeck(session.seed)),
    [session.seed, content],
  );
  const { state, dispatch, ready, warning } = useGameSession(definition, session);
  const [flipped, setFlipped] = useState<number[]>([]),
    [message, setMessage] = useState("Pick two cards. Find what belongs together.");
  const revealRemaining = useRef(0);
  if (!ready) return <p className="loading">Shuffling the flowers…</p>;
  function flip(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || state.matched.includes(index)) return;
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      const match = isPair(deck, next[0], next[1]);
      dispatch({ type: "choose-pair", cards: [next[0], next[1]] });
      revealRemaining.current = 900;
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
            <PhaserSurface
              game="pairs"
              onFrame={(delta) => {
                if (flipped.length === 2) {
                  revealRemaining.current -= delta;
                  if (revealRemaining.current <= 0) setFlipped([]);
                }
              }}
              picture={{
                nodes: deck.map((symbol, index) => {
                  const matched = state.matched.includes(index),
                    visible = matched || flipped.includes(index);
                  return {
                    id: `pair-${index}`,
                    text: visible ? symbols[symbol] : "✳",
                    fill: visible && !matched ? "--panel" : "--rose",
                    color: "--rose-ink",
                    opacity: matched ? 0.65 : 1,
                  };
                }),
              }}
            >
              <div className="pairs-board">
                {deck.map((symbol, index) => {
                  const matched = state.matched.includes(index),
                    visible = matched || flipped.includes(index);
                  return (
                    <button
                      type="button"
                      key={`card-${index}`}
                      data-card={index}
                      data-scene-id={`pair-${index}`}
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
            </PhaserSurface>
            <p className="feedback" role="status">
              {message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
