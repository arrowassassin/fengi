"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h1>A small interruption.</h1>
      <p>Something went wrong loading this view. Saved progress remains on this device.</p>
      <div className="actions centered">
        <button type="button" className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Back home
        </Link>
      </div>
    </section>
  );
}
