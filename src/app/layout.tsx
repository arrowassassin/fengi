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
        {process.env.FENGI_STORAGE_MODE === "ephemeral" && (
          <p className="storage-notice">
            Demo hosting: server saves can reset on restart. Keep your browser copy and export
            important progress.
          </p>
        )}
        <main id="main" className="main-container">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
