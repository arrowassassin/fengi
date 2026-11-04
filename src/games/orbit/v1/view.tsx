"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Result, SaveNotice } from "../../../components/game-shared";
import type { GeneratedPack } from "../../generated-content";
import { generatedGate, generatedTarget, orbitDefinition } from "../../generated-definitions";
import type { Session } from "../../registry";
import { orbitGame } from "../../releases/definitions-v1";
import { PhaserSurface } from "../../runtime/phaser-surface";
import { useGameSession } from "../../runtime/use-game-session";
import {
  DURATION,
  hazardActive as defaultHazardActive,
  target as defaultTarget,
  hazards,
  initialOrbit,
  type OrbitState,
  orbitScore,
  STEP,
} from "./engine";

export default function Orbit({
  session,
  content,
}: {
  session: Session;
  content?: GeneratedPack["orbit"];
}) {
  const definition = useMemo(() => (content ? orbitDefinition(content) : orbitGame), [content]);
  const target = (seed: string, index: number) =>
    content ? generatedTarget(content, index) : defaultTarget(seed, index);
  const hazardActive = (tick: number, index: number) =>
    content ? generatedGate(content, tick, index) : defaultHazardActive(tick, index);
  const { state, commit: setState, ready, warning, saveNow } = useGameSession(definition, session);
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
  const accumulator = useRef(0),
    lastSavedTick = useRef(0);
  function step(deltaMs: number) {
    if (!running || !ready) return;
    accumulator.current += Math.min(deltaMs / 1000, 0.1);
    while (accumulator.current >= STEP && !simulation.current.done) {
      simulation.current = definition.reduce(session, simulation.current, { type: "step" });
      accumulator.current -= STEP;
    }
    setFrame(simulation.current);
    if (simulation.current.tick - lastSavedTick.current >= 60 || simulation.current.done) {
      lastSavedTick.current = simulation.current.tick;
      setState({ ...simulation.current });
    }
    if (simulation.current.done) setRunning(false);
  }
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        setRunning(false);
        accumulator.current = 0;
        setState({ ...simulation.current });
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [setState]);
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
            <PhaserSurface
              game="orbit"
              onFrame={step}
              picture={{
                nodes: [],
                orbit: {
                  angle: frame.angle,
                  spark: target(session.seed, frame.sparks),
                  gates: hazards.map((angle, i) => ({
                    angle,
                    closed: hazardActive(frame.tick, i),
                  })),
                  score: orbitScore(frame),
                  running,
                  recovering: frame.cooldown > 0,
                },
              }}
            >
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
            </PhaserSurface>
            <div className="actions centered">
              <button
                type="button"
                className="button primary"
                disabled={!running}
                onClick={() => {
                  simulation.current = definition.reduce(session, simulation.current, {
                    type: "reverse",
                  });
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
