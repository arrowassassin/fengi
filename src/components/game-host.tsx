"use client";
import dynamic from "next/dynamic";
import type { Session } from "../games/registry";

const loading = () => <p className="loading">Getting your game ready…</p>;
const Signal = dynamic(() => import("../games/signal/view"), { loading });
const Orbit = dynamic(() => import("../games/orbit/view"), { loading });
const Odd = dynamic(() => import("../games/odd/view"), { loading });
const Trail = dynamic(() => import("../games/trail/view"), { loading });
const Pairs = dynamic(() => import("../games/pairs/view"), { loading });
export function GameHost({ session }: { session: Session }) {
  const Component = { signal: Signal, orbit: Orbit, odd: Odd, trail: Trail, pairs: Pairs }[
    session.game
  ];
  return <Component key={session.id} session={session} />;
}
