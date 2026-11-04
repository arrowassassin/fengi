"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Result, SaveNotice } from "../../../components/game-shared";
import { useSavedGame } from "../../../components/use-saved-game";
import type { Session } from "../../registry";
import {
  advance,
  DURATION,
  hazardActive,
  hazards,
  initialOrbit,
  type OrbitState,
  orbitScore,
  STEP,
  target,
} from "./engine";

const schema = z.object({
  tick: z.number().int().min(0).max(2700),
  angle: z
    .number()
    .min(0)
    .max(Math.PI * 2),
  direction: z.union([z.literal(1), z.literal(-1)]),
  sparks: z.number().int().min(0).max(2700),
  lives: z.number().int().min(0).max(3),
  cooldown: z.number().int().min(0).max(70),
  done: z.boolean(),
});
export default function Orbit({ session }: { session: Session }) {
  const { state, setState, ready, warning, saveNow } = useSavedGame(
    session,
    initialOrbit(),
    (value) => {
      const parsed = schema.safeParse(value);
      return parsed.success &&
        parsed.data.done === (parsed.data.lives === 0 || parsed.data.tick === 2700)
        ? parsed.data
        : null;
    },
    (s) => ({
      completed: s.done,
      summary: `${orbitScore(s)} points${session.calm ? " · calm" : ""}`,
    }),
  );
  const simulation = useRef<OrbitState>(initialOrbit()),
    initialized = useRef(false),
    [frame, setFrame] = useState(initialOrbit),
    [running, setRunning] = useState(false);
  useEffect(() => {
    if (ready && !initialized.current) {
      simulation.current = state;
      setFrame(state);
      initialized.current = true;
    }
  }, [ready, state]);
  useEffect(() => {
    if (!running || !ready) return;
    let request = 0,
      last = 0,
      accumulator = 0;
    const loop = (now: number) => {
      if (last) accumulator += Math.min((now - last) / 1000, 0.1);
      last = now;
      while (accumulator >= STEP && !simulation.current.done) {
        simulation.current = advance(simulation.current, session.seed, session.calm);
        accumulator -= STEP;
      }
      setFrame(simulation.current);
      if (simulation.current.tick % 60 === 0 || simulation.current.done)
        setState({ ...simulation.current });
      if (simulation.current.done) {
        setRunning(false);
        return;
      }
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    const pause = () => {
      if (document.hidden) {
        setRunning(false);
        setState({ ...simulation.current });
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [running, ready, session.seed, session.calm, setState]);
  useEffect(() => {
    if (!ready) return;
    const save = () => saveNow(simulation.current);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [ready, saveNow]);
  if (!ready) return <p className="loading">Setting your orbit…</p>;
  const point = (angle: number, radius = 118) => ({
      x: 160 + Math.cos(angle) * radius,
      y: 160 + Math.sin(angle) * radius,
    }),
    player = point(frame.angle),
    spark = point(target(session.seed, frame.sparks));
  return (
    <>
      <SaveNotice warning={warning} />
      {frame.done ? (
        <Result
          session={session}
          title="Orbit Tap"
          summary={`${orbitScore(frame)} points · ${frame.sparks} sparks${session.calm ? " · calm practice" : ""}`}
        >
          <p>
            {frame.lives
              ? "A full orbit of focus. Nicely done."
              : "Three bumps, plenty of sparks. Every round teaches you the rhythm."}
          </p>
        </Result>
      ) : (
        <div className="play-layout">
          <div className="game-intro">
            <span className="eyebrow">One button. A whole new rhythm.</span>
            <h2>Find your flow.</h2>
            <p>
              Collect gold sparks. Reverse direction to avoid the three gates while they’re closed.
              Gates pulse open and shut.
            </p>
            <details className="rules">
              <summary>Controls and scoring</summary>
              <p>
                Press Reverse direction, or focus that button and use Space/Enter. Each spark earns
                10 points. Three collisions end the round; otherwise play for 45 active seconds.
                Leaving the tab pauses automatically. Calm practice moves more slowly and has
                separate results.
              </p>
            </details>
            <p className="stat-line">
              {orbitScore(frame)} pts <span>·</span> {frame.lives} lives <span>·</span>{" "}
              {Math.ceil(DURATION - frame.tick * STEP)}s
            </p>
            <p className="small muted">
              {session.calm ? "Calm practice · slower movement" : "Standard pace"} · Pausing has no
              penalty
            </p>
          </div>
          <div className="board-area">
            <div className="orbit-stage">
              <svg
                viewBox="0 0 320 320"
                role="img"
                aria-label={`Orbit arena: ${frame.sparks} sparks, ${frame.lives} lives, ${running ? "running" : "paused"}`}
              >
                <circle className="orbit-track" cx="160" cy="160" r="118" fill="none" />
                {hazards.map((angle, i) => {
                  const p = point(angle);
                  return (
                    <g key={`gate-${i}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="13"
                        className={hazardActive(frame.tick, i) ? "gate closed" : "gate"}
                      />
                      <text x={p.x} y={p.y + 4} textAnchor="middle" className="gate-label">
                        {hazardActive(frame.tick, i) ? "×" : "·"}
                      </text>
                    </g>
                  );
                })}
                <circle cx={spark.x} cy={spark.y} r="9" className="spark" />
                <circle
                  cx={player.x}
                  cy={player.y}
                  r="10"
                  className={`orbiter ${frame.cooldown ? "recovering" : ""}`}
                />
                <text x="160" y="151" textAnchor="middle" className="orbit-score">
                  {orbitScore(frame)}
                </text>
                <text x="160" y="178" textAnchor="middle" className="orbit-caption">
                  {running ? "FIND YOUR RHYTHM" : frame.tick ? "PAUSED" : "READY WHEN YOU ARE"}
                </text>
              </svg>
            </div>
            <div className="actions centered">
              <button
                type="button"
                className="button primary"
                disabled={!running}
                onClick={() => {
                  simulation.current = {
                    ...simulation.current,
                    direction: -simulation.current.direction,
                  };
                  setFrame(simulation.current);
                }}
              >
                Reverse direction ↔
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (running) setState({ ...simulation.current });
                  setRunning((v) => !v);
                }}
              >
                {running ? "Pause" : frame.tick ? "Resume" : "Start run"}
              </button>
            </div>
            <p className="small muted centered">
              Solid × gates hurt. Faint gates are safe to cross.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
