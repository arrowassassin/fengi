import Link from "next/link";
import { games, utcDate } from "../../games/registry";
export const dynamic = "force-dynamic";
export const metadata = { title: "Archive" };
export default function Archive() {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) =>
    utcDate(new Date(today.getTime() - i * 86400000)),
  );
  return (
    <>
      <p className="eyebrow">Good games don’t expire</p>
      <h1>The daily archive.</h1>
      <p className="page-lead">
        Missed a day? Take it at your own pace. Editions use UTC and keep their original rules.
      </p>
      <div className="archive-list">
        {dates.map((date, i) => (
          <section className="archive-day" key={date}>
            <div>
              <h2>
                {i === 0
                  ? "Today"
                  : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
                      weekday: "long",
                      timeZone: "UTC",
                    })}
              </h2>
              <time dateTime={date}>{date}</time>
            </div>
            <div className="archive-games">
              {games.map((game) => (
                <Link
                  className={`archive-link tone-${game.color}`}
                  key={game.id}
                  href={`/play/${game.id}?date=${date}`}
                >
                  {game.name}
                  <span aria-hidden="true">↗︎</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
