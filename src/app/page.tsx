import Link from "next/link";
import { GameArt } from "../components/game-art";
import { games, utcDate } from "../games/registry";
export const dynamic = "force-dynamic";
export default function Home() {
  const date = utcDate();
  return (
    <>
      <div className="home-heading">
        <div>
          <p className="eyebrow">
            A little room for play <span className="tiny-flower">✳</span>
          </p>
          <h1>
            Small games.
            <br />
            <em>Big little victories.</em>
          </h1>
        </div>
        <p className="home-aside">
          A few quiet minutes.
          <br />A beautifully good challenge.
          <br />
          <span className="edition">EDITION / {date}</span>
        </p>
      </div>
      <section className="featured">
        <div className="feature-copy">
          <span className="pill">TODAY’S FEATURE · LOGIC</span>
          <h2>Signal Grid</h2>
          <p>
            A little logic. A lovely click.
            <br />
            Find the pattern hiding in plain sight.
          </p>
          <div className="game-meta">
            <span>3–5 minutes</span>
            <span>One unique solution</span>
          </div>
          <Link className="button primary" href={`/play/signal?date=${date}`}>
            Play today <span aria-hidden="true">↗︎</span>
          </Link>
          <span className="small muted">No account. No clock. Just you.</span>
        </div>
        <div className="feature-art">
          <GameArt game="signal" large />
          <span className="art-note">Everything clicks.</span>
          <span className="feature-spark" aria-hidden="true">
            ✳
          </span>
        </div>
      </section>
      <div className="section-heading">
        <h2>A different kind of delight</h2>
        <span className="small muted">Five ways to find your flow</span>
      </div>
      <div className="game-grid">
        {games.slice(1).map((game) => (
          <Link
            className={`game-card tone-${game.color}`}
            href={`/play/${game.id}?date=${date}`}
            key={game.id}
          >
            <div>
              <span className="eyebrow">
                {game.category} · {game.time}
              </span>
              <h3>
                {game.name} <span aria-hidden="true">↗︎</span>
              </h3>
              <p>{game.line}</p>
            </div>
            <GameArt game={game.id} />
          </Link>
        ))}
      </div>
      <section className="collection-promo">
        <div className="mascot-display" aria-hidden="true" />
        <div>
          <p className="eyebrow">A curious little club</p>
          <h2>
            Good company.
            <br />
            Odd answers.
          </h2>
          <p>
            Explore our reviewed wordplay collections. Familiar subjects, unexpected combinations,
            and absolutely no rush.
          </p>
          <Link className="button secondary" href="/collections">
            Meet the collections
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </section>
      <section className="practice-strip">
        <div>
          <span className="eyebrow">Not done exploring?</span>
          <h2>There’s room for one more.</h2>
          <p>Fresh layouts, your own pace. Practice whenever you like.</p>
        </div>
        <Link className="button secondary" href="/practice">
          Explore practice <span aria-hidden="true">→</span>
        </Link>
      </section>
    </>
  );
}
