import type { GameId } from "../games/registry";
export function GameArt({ game, large = false }: { game: GameId; large?: boolean }) {
  if (game === "signal")
    return (
      <div className={`grid-art ${large ? "large" : ""}`} aria-hidden="true">
        {[1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1].map((v, i) => (
          <span key={`art-${i}`} className={v ? "filled" : ""}>
            {v ? "●" : "×"}
          </span>
        ))}
      </div>
    );
  if (game === "orbit")
    return (
      <div className="orbit-art" aria-hidden="true">
        <span className="orbit-art-dot" />
        <span className="orbit-art-spark">✦</span>
      </div>
    );
  if (game === "odd")
    return (
      <div className="word-art" aria-hidden="true">
        Aa<span>?</span>
      </div>
    );
  if (game === "trail")
    return (
      <div className="trail-art" aria-hidden="true">
        <span>✿</span>
        <span />
        <span>⌂</span>
        <span />
        <span>●</span>
        <span />
        <span>✿</span>
        <span />
        <span>✿</span>
      </div>
    );
  return (
    <div className="pair-art" aria-hidden="true">
      <span>✿</span>
      <span>✿</span>
    </div>
  );
}
