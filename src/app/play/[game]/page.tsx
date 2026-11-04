import Link from "next/link";
import { notFound } from "next/navigation";
import { GameHost } from "../../../components/game-host";
import { games, isGameId, sessionFor, supportsVersion } from "../../../games/registry";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props) {
  const { game } = await params;
  return { title: games.find((g) => g.id === game)?.name ?? "Game not found" };
}
export default async function Play({ params, searchParams }: Props) {
  const { game } = await params;
  if (!isGameId(game)) notFound();
  const raw = await searchParams,
    query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") query.set(key, value);
  const session = sessionFor(game, query),
    info = games.find((g) => g.id === game);
  if (!supportsVersion(game, session.rulesVersion))
    return (
      <section>
        <h1>This edition is unavailable.</h1>
        <p>
          Your saved progress has not been changed. This rule version cannot run on this server.
        </p>
        <Link href="/progress">Back to your progress</Link>
      </section>
    );
  return (
    <section className={`game-page tone-${info?.color}`}>
      <div className="play-header">
        <Link className="back-link" href="/">
          ← All games
        </Link>
        <span className="pill">
          {session.mode === "daily" ? "DAILY" : "PRACTICE"} / {session.label}
          {session.calm ? " · CALM" : ""}
        </span>
      </div>
      <div className="play-title">
        <h1>{info?.name}</h1>
        <p>
          {info?.category} <span>·</span> {info?.time}
        </p>
      </div>
      <GameHost session={session} />
    </section>
  );
}
