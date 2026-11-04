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
        Three familiar subjects. An unexpected combination. Explore reviewed Odd Answer collections
        at your own pace.
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
          <h2>Good things take a little care.</h2>
          <p>
            No collections have been published yet. Our original games are ready whenever you are.
          </p>
          <Link className="button primary" href="/play/odd">
            Play today’s Odd Answer
          </Link>
        </div>
      )}
    </section>
  );
}
