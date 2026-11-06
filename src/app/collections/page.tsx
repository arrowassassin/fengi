import Link from "next/link";
import { publishedEditions } from "../../server/editorial";
export const dynamic = "force-dynamic";
export const metadata = { title: "The play collection" };
export default function Collections() {
  const editions = publishedEditions();
  return (
    <section>
      <p className="eyebrow">A fresh perspective</p>
      <h1>The play collection.</h1>
      <p className="collection-intro">
        A new perspective on your favorite games. Play reviewed collections with verified rules,
        including AI-assisted practice layouts.
      </p>
      {editions.length ? (
        <div className="edition-grid">
          {editions.map((e) => (
            <Link className="edition-card" href={`/collections/${e.id}`} key={e.id}>
              <span className="eyebrow">
                {e.source === "nvidia"
                  ? "AI-assisted · human reviewed"
                  : "Curated · human reviewed"}
              </span>
              <h2>{e.title}</h2>
              <p>{e.description}</p>
              <span className="edition-link">
                Explore collection <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-collection">
          <h2>No collections yet.</h2>
          <p>Reviewed packs will appear here. Today’s five games are ready whenever you are.</p>
          <Link className="button primary" href="/">
            Explore today’s games
          </Link>
        </div>
      )}
    </section>
  );
}
