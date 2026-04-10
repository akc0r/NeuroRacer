import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeuroRacer — AI Racing Simulation",
  description:
    "Watch neural networks learn to drive through neuroevolution. Real-time genetic algorithm simulation in your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-zinc-950 text-white antialiased`}
      >
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="flex items-center justify-between px-6 h-12">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-bold tracking-tight hover:text-purple-400 transition-colors"
            >
              <span className="text-lg">🏎️</span>
              <span className="font-mono">NeuroRacer</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
              >
                Simulation
              </Link>
              <Link
                href="/leaderboard"
                className="px-3 py-1.5 rounded-md text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        </nav>

        {/* Page content (offset for fixed nav) */}
        <main className="pt-12">{children}</main>
      </body>
    </html>
  );
}
