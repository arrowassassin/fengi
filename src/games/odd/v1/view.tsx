"use client";
import { useMemo, useState } from "react";
import { Result, SaveNotice } from "../../../components/game-shared";
import type { Session } from "../../registry";
import { oddGame } from "../../releases/definitions-v1";
import { PhaserSurface } from "../../runtime/phaser-surface";
import { useGameSession } from "../../runtime/use-game-session";
import { dailyPrompts, judge } from "./engine";

export default function Odd({ session }: { session: Session }) {
  const prompts = useMemo(() => dailyPrompts(session.seed), [session.seed]);
  const { state, dispatch, ready, warning } = useGameSession(oddGame, session);
  const [answer, setAnswer] = useState(""),
    [error, setError] = useState("");
  if (!ready) return <p className="loading">Opening your prompts…</p>;
  const index = state.answers.length,
    current = prompts[index],
    score = state.answers.reduce(
      (sum, answer, i) => sum + (answer ? (judge(prompts[i], answer)?.points ?? 0) : 0),
      0,
    );
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = judge(current, answer);
    if (!result) {
      setError(
        "Not in this edition’s list. Try another answer, or skip. This is not a claim that your answer is factually wrong.",
      );
      return;
    }
    dispatch({ type: "answer", answer: result.word });
    setAnswer("");
    setError("");
  }
  return (
    <>
      <SaveNotice warning={warning} />
      {index === 3 ? (
        <Result session={session} title="Odd Answer" summary={`${score} / 120 editorial points`}>
          <div className="answer-review">
            {prompts.map((p, i) => (
              <details key={p.id}>
                <summary>
                  {state.answers[i] ?? "Skipped"} ·{" "}
                  {state.answers[i] ? judge(p, state.answers[i])?.points : 0} points
                </summary>
                <p>{p.prompt}</p>
                <p>{p.answers.map((a) => `${a.word} (${a.points})`).join(" · ")}</p>
              </details>
            ))}
          </div>
        </Result>
      ) : (
        <div className="word-layout">
          <div className="game-intro">
            <span className="eyebrow">Take the road less answered</span>
            <h2>The unexpected fits.</h2>
            <p>
              Three prompts. One accepted answer per prompt. Find a less obvious fit—or a familiar
              favorite.
            </p>
            <details className="rules">
              <summary>How scoring works</summary>
              <p>
                Each answer has a fixed editorial tier of 10, 20, 30 or 40 points. These are design
                choices, not measured player rarity. No speed bonus or AI judging. Exact names and
                listed aliases count; spelling is not silently changed.
              </p>
            </details>
            <p className="small muted">
              Eight curated categories, shuffled for practice. More content is an editorial task,
              not an infinite AI promise.
            </p>
          </div>
          <div className="word-panel">
            <PhaserSurface
              game="odd"
              picture={{
                nodes: [
                  { id: "odd-prompt", text: current.prompt, color: "--ink", shape: "text" },
                  { id: "odd-score", text: `${score} pts`, color: "--lilac-ink", shape: "text" },
                  ...[0, 1, 2].map((i) => ({
                    id: `odd-round-${i}`,
                    text:
                      i < index
                        ? `${state.answers[i] === null ? "Skip" : (judge(prompts[i], state.answers[i] ?? "")?.points ?? 0)}`
                        : String(i + 1),
                    fill: i === index ? "--lilac-ink" : "--panel",
                    color: i === index ? "--panel" : "--lilac-ink",
                  })),
                ],
              }}
            >
              <div className="spread">
                <span className="pill">PROMPT {index + 1} / 3</span>
                <span data-scene-id="odd-score">{score} pts</span>
              </div>
              <ol className="word-rounds" aria-label="Round progress">
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    data-scene-id={`odd-round-${i}`}
                    aria-label={`Round ${i + 1}: ${i < index ? "answered" : i === index ? "current" : "upcoming"}`}
                  >
                    {i + 1}
                  </li>
                ))}
              </ol>
              <h3 data-scene-id="odd-prompt">{current.prompt}</h3>
            </PhaserSurface>
            <p className="small muted">{current.note}</p>
            <form onSubmit={submit}>
              <label htmlFor="odd-answer">Your answer</label>
              <input
                id="odd-answer"
                value={answer}
                maxLength={80}
                autoComplete="off"
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Something comes to mind…"
                required
              />
              <div className="actions">
                <button className="button primary" type="submit">
                  Lock answer <span aria-hidden="true">→</span>
                </button>
                <button
                  className="button text"
                  type="button"
                  onClick={() => {
                    dispatch({ type: "answer", answer: null });
                    setAnswer("");
                    setError("");
                  }}
                >
                  Skip prompt
                </button>
              </div>
            </form>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            {index > 0 && (
              <p className="small muted" role="status">
                Previous answer: {state.answers[index - 1] ?? "skipped"}. Your progress is saved.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
