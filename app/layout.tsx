import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meals Planner",
  description: "Weekly meal planning with optional day assignment",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  const currentWeek = monday.toISOString().slice(0, 10);

  return (
    <html lang="en">
      <body>
        <header className="top-nav-wrap">
          <nav className="top-nav" aria-label="Primary navigation">
            <Link className="week-link" href={`/weeks/${currentWeek}`}>
              Weekly plan
            </Link>
            <Link className="week-link" href="/history">
              History
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
