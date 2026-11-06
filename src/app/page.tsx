import Link from "next/link";
import { GameShelf } from "../components/game-shelf";
import { utcDate } from "../games/registry";
export const dynamic = "force-dynamic";
function Spark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M16 3v26M3 16h26M7 7l18 18M7 25L25 7" />
    </svg>
  );
}
export default function Home() {
  const date = utcDate();
  return (
    <>
      <section className="club-welcome" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" /> THE EVERYDAY PLAY CLUB
          </p>
          <h1 id="welcome-title">
            A small break.
            <br />
            <span>A good kind of challenge.</span>
          </h1>
          <p>
            Five games for your curious side. Find your favorite, make a little progress, and leave
            feeling good.
          </p>
          <Link className="button primary welcome-cta" href={`/play/signal?date=${date}`}>
            Play today’s Signal Grid <span aria-hidden="true">→</span>
          </Link>
          <div className="welcome-details">
            <span>No account needed</span>
            <span>Play in your browser</span>
          </div>
        </div>
        <div className="welcome-character" aria-hidden="true">
          <span className="character-orbit orbit-one" />
          <span className="character-orbit orbit-two" />
          <div className="mascot-display" />
          <span className="character-caption">less scroll. more play.</span>
          <span className="character-star">
            <Spark />
          </span>
        </div>
      </section>
      <div className="edition-date">
        <time dateTime={date}>
          {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </time>
        <span>Made for a moment to yourself</span>
      </div>
      <GameShelf date={date} />
      <section className="collection-promo">
        <div className="collection-stamp" aria-hidden="true">
          <span>
            FRESH
            <br />
            PERSPECTIVES
          </span>
          <span>
            <Spark />
          </span>
        </div>
        <div>
          <p className="eyebrow">More ways to play</p>
          <h2>
            A different day.
            <br />A different little discovery.
          </h2>
          <p>
            Explore reviewed game collections, including AI-assisted layouts checked against our
            game rules.
          </p>
          <Link className="button primary" href="/collections">
            Meet the collections <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      <section className="practice-strip">
        <div>
          <p className="eyebrow">Just one more?</p>
          <h2>Good games don’t need a deadline.</h2>
          <p>Try a fresh practice round or revisit an edition you missed.</p>
        </div>
        <div className="actions">
          <Link className="button secondary" href="/practice">
            Explore practice →
          </Link>
          <Link className="button text" href="/archive">
            Visit the archive
          </Link>
        </div>
      </section>
    </>
  );
}
