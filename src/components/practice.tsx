"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type GameId, games } from "../games/registry";
import { GameArt } from "./game-art";
export function Practice() {
  const router = useRouter(),
    [calm, setCalm] = useState(false);
  function start(game: GameId) {
    const seed = crypto.randomUUID();
    router.push(
      `/play/${game}?mode=practice&seed=${seed}${game === "orbit" && calm ? "&pace=calm" : ""}`,
    );
  }
  return (
    <div className="practice-grid">
      {games.map((game) => (
        <article className={`practice-card tone-${game.color}`} key={game.id}>
          <div className="practice-art">
            <GameArt game={game.id} />
          </div>
          <span className="eyebrow">
            {game.category} · {game.time}
          </span>
          <h2>{game.name}</h2>
          <p>{game.description}</p>
          {game.id === "orbit" ? (
            <label className="toggle-label">
              <input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} />
              Calm pace · slower movement
            </label>
          ) : game.id === "odd" ? (
            <p className="small muted">A new mix of our eight curated categories.</p>
          ) : (
            <p className="small muted">A new seeded layout every round.</p>
          )}
          <button type="button" className="button primary" onClick={() => start(game.id)}>
            Play {game.name} <span aria-hidden="true">→</span>
          </button>
        </article>
      ))}
    </div>
  );
}
