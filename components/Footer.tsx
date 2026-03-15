import Link from "next/link";
import { Home, Bot, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold text-text">
                Namma Nest
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
              AI-powered rental search for houses and PGs across India.
              Zero brokers, zero spam. Pay once with GOAT tokens and let
              our AI find your perfect home.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-text">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-text-muted transition-colors hover:text-primary"
                >
                  Search Rentals
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-text-muted transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="https://t.me/ThrxBot"
                  target="_blank"
                  className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-primary"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Telegram Bot
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-text">
              Built With
            </h3>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-text-muted">OpenClaw AI Agent</li>
              <li className="text-sm text-text-muted">x402 Protocol</li>
              <li className="text-sm text-text-muted">GOAT Test Tokens</li>
              <li className="text-sm text-text-muted">Next.js + Vercel</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Namma Nest. Built with care in Bengaluru.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted transition-colors hover:text-primary"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://t.me/ThrxBot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted transition-colors hover:text-primary"
            >
              <Bot className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
