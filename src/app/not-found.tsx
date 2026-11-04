import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-state">
      <span aria-hidden="true">?</span>
      <h1>A little off the path.</h1>
      <p>That game or page isn’t here.</p>
      <Link className="button primary" href="/">
        Back to Fengi →
      </Link>
    </section>
  );
}
