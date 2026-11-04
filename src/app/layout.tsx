import type { Metadata } from "next";
import { Footer, Header } from "../components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Fengi — Small games. Big little victories.", template: "%s · Fengi" },
  description:
    "Five little browser games for a moment well spent. Daily logic, arcade, wordplay, strategy and memory. No account needed.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" className="main-container">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
