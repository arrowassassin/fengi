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
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={
                path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "page" : undefined
              }
            >
              <span className="nav-icon" aria-hidden="true">
                <NavigationIcon href={href} />
              </span>
              <span>{label === "Your progress" ? "Progress" : label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="theme-button"
          onClick={toggle}
          aria-label={dark ? "Use light theme" : "Use dark theme"}
        >
          <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
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

function NavigationIcon({ href }: { href: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {href === "/" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </>
      ) : href === "/practice" ? (
        <>
          <path d="m12 3 9 9-9 9-9-9Z" />
          <path d="M9 12h6m-3-3v6" />
        </>
      ) : href === "/archive" ? (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4m8-4v4M4 11h16M8 15h3m3 0h2" />
        </>
      ) : href === "/collections" ? (
        <path d="m4 7 8-4 8 4-8 4Zm0 5 8 4 8-4M4 17l8 4 8-4" />
      ) : (
        <>
          <path d="m4 17 5-5 4 3 7-9m-5 0h5v5" />
          <path d="M4 4v17h17" />
        </>
      )}
    </svg>
  );
}
