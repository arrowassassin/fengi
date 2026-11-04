"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export function Header() {
  const path = usePathname(),
    [dark, setDark] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fengi:theme");
      const next = saved
        ? saved === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(next);
      document.documentElement.dataset.theme = next ? "dark" : "light";
    } catch {
      /* Theme is optional. */
    }
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("fengi:theme", next ? "dark" : "light");
    } catch {
      /* Keep in-memory theme. */
    }
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Fengi home">
          <span className="brand-mascot" aria-hidden="true" />
          <span className="brand-word">
            fengi<span>.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["/", "Today"],
            ["/practice", "Practice"],
            ["/archive", "Archive"],
            ["/collections", "Collections"],
            ["/progress", "Your progress"],
          ].map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="theme-button"
          onClick={toggle}
          aria-label={dark ? "Use light theme" : "Use dark theme"}
        >
          {dark ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        <span className="footer-mark" aria-hidden="true" /> Play a little. Stay curious.
      </p>
      <div>
        <span>Daily editions reset at 00:00 UTC</span>
        <Link href="/about">About & privacy</Link>
      </div>
    </footer>
  );
}
