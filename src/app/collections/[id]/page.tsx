import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "../../../games/odd/content";
import { publicEdition } from "../../../server/editorial";
export const dynamic = "force-dynamic";
export const metadata = { title: "A reviewed Fengi collection" };
export default async function Collection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    e = publicEdition(id);
  if (!e) notFound();
  return (
    <section className="collection-detail">
      <Link className="back-link" href="/collections">
        ← All collections
      </Link>
      <p className="eyebrow">
        {e.source === "nvidia" ? "AI-assisted · human reviewed" : "Curated · human reviewed"}
      </p>
      <h1>{e.title}</h1>
      <p className="collection-intro">{e.description}</p>
      <ul className="category-chips">
        {e.categoryIds.map((category) => (
          <li key={category}>{categories.find((c) => c.id === category)?.prompt}</li>
        ))}
      </ul>
      <nav className="collection-games" aria-label="Play reviewed games">
        <Link className="button primary" href={`/play/odd?collection=${e.id}`}>
          Play this collection <span aria-hidden="true">↗</span>
        </Link>
        {e.pack &&
          ["signal", "pairs", "orbit"].map((game) => (
            <Link key={game} className="button primary" href={`/play/${game}?collection=${e.id}`}>
              Play{" "}
              {game === "signal" ? "Signal Grid" : game === "pairs" ? "Pair Bloom" : "Orbit Tap"}
            </Link>
          ))}
        {e.garden && (
          <Link className="button primary" href={`/collections/${e.id}/trail`}>
            Play generated garden
          </Link>
        )}
      </nav>
      <p className="small muted">
        Original answers and scoring. Your progress saves as a practice game.
      </p>
    </section>
  );
}
