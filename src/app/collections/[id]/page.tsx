import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "../../../games/odd/content";
import { publicEdition } from "../../../server/editorial";
export const dynamic = "force-dynamic";
export const metadata = { title: "An Odd Answer collection" };
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
      <Link className="button primary" href={`/play/odd?collection=${e.id}`}>
        Play this collection <span aria-hidden="true">↗</span>
      </Link>
      <p className="small muted">
        Original answers and scoring. Your progress saves as a practice game.
      </p>
    </section>
  );
}
