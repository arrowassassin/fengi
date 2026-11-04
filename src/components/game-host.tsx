"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Session } from "../games/registry";
import { readRecords, removeRecord } from "../lib/persistence";
import { downloadRecords } from "../lib/progress-client";

const loading = () => <p className="loading">Getting your game ready…</p>;
const Signal = dynamic(() => import("../games/signal/v1/view"), { loading });
const Orbit = dynamic(() => import("../games/orbit/v1/view"), { loading });
const Odd = dynamic(() => import("../games/odd/v1/view"), { loading });
const Trail = dynamic(() => import("../games/trail/v1/view"), { loading });
const Pairs = dynamic(() => import("../games/pairs/v1/view"), { loading });
export function GameHost({ session }: { session: Session }) {
  return <SessionHost key={session.id} session={session} />;
}
function SessionHost({ session }: { session: Session }) {
  const [lease, setLease] = useState<"waiting" | "owned" | "busy">("waiting");
  const [conflict, setConflict] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    let release: () => void = () => {};
    let cancelled = false;
    if (!navigator.locks) {
      setLease("owned");
      return;
    }
    void navigator.locks.request(
      `fengi:game:${session.id}`,
      { ifAvailable: true },
      async (lock) => {
        if (cancelled) return;
        if (!lock) {
          setLease("busy");
          return;
        }
        setLease("owned");
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    );
    return () => {
      cancelled = true;
      release();
    };
  }, [session.id]);
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent<string>).detail === session.id) setConflict(true);
    };
    window.addEventListener("fengi:conflict", handler);
    return () => window.removeEventListener("fengi:conflict", handler);
  }, [session.id]);
  if (conflict)
    return (
      <section role="alert">
        <h2>Your progress changed elsewhere.</h2>
        <p>
          Your local copy is kept. Download it before loading the server copy if you want to
          preserve both.
        </p>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            try {
              downloadRecords(readRecords(localStorage).filter((r) => r.id === session.id));
            } catch {
              setDownloadError(
                "Browser storage is unavailable; there is no downloadable local copy.",
              );
            }
          }}
        >
          Download local copy
        </button>
        <button
          className="button primary"
          type="button"
          onClick={() => {
            try {
              removeRecord(localStorage, session.id);
            } catch {
              /* Server recovery still works without local storage. */
            }
            location.reload();
          }}
        >
          Load server copy
        </button>
        {downloadError && <p>{downloadError}</p>}
      </section>
    );
  if (lease === "waiting") return <p className="loading">Opening your game…</p>;
  if (lease === "busy")
    return (
      <section>
        <h2>This game is open in another tab.</h2>
        <p>Finish or close that tab before continuing here. This prevents conflicting moves.</p>
        <button type="button" className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </section>
    );
  const versions: Record<number, typeof Signal> = {
    1: { signal: Signal, orbit: Orbit, odd: Odd, trail: Trail, pairs: Pairs }[session.game],
  };
  const Component = versions[session.rulesVersion];
  if (!Component) return <p>This rule version is unavailable. Your save is unchanged.</p>;
  return <Component key={session.id} session={session} />;
}
