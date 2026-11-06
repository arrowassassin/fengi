"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type Session, sessionHref } from "../games/registry";
export function SaveNotice({ warning }: { warning: string }) {
  return warning ? (
    <p className="notice" role="status">
      {warning}
    </p>
  ) : null;
}
export function Result({
  session,
  title,
  summary,
  children,
}: {
  session: Session;
  title: string;
  summary: string;
  children?: React.ReactNode;
}) {
  const [shared, setShared] = useState(false),
    [manual, setManual] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const text = `Fengi · ${title} · ${session.label}${session.calm ? " · Calm" : ""}\n${summary}\n${typeof window !== "undefined" ? window.location.origin + sessionHref(session) : ""}`;
  async function share() {
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setManual(true);
    }
  }
  return (
    <section className="result-panel">
      <span className="eyebrow">A little victory, all yours</span>
      <div className="victory-mark" aria-hidden="true">
        ✦
      </div>
      <h2 ref={heading} tabIndex={-1}>
        Time well spent.
      </h2>
      <p className="result-summary">{summary}</p>
      {children}
      <div className="actions">
        <Link className="button primary" href="/">
          Done for now <span aria-hidden="true">✓</span>
        </Link>
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            router.push(
              `/play/${session.game}?mode=practice&seed=${crypto.randomUUID()}${session.calm ? "&pace=calm" : ""}`,
            )
          }
        >
          Another round
        </button>
        <button type="button" className="button text" onClick={share}>
          {shared ? "Copied!" : "Share result"}
        </button>
      </div>
      {manual && (
        <label className="share-fallback">
          Copy your result
          <textarea readOnly value={text} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <p className="muted small">No streak to protect. Come back when you feel like it.</p>
    </section>
  );
}
