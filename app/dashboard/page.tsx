"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CreditCard,
  Bookmark,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatRent, formatDate, formatPropertyType } from "@/lib/utils/formatter";
import type { Listing } from "@/types/listing";

type TabKey = "searches" | "payments" | "saved";

interface SearchHistoryItem {
  id: string;
  location_text: string;
  status: string;
  created_at: string;
  preferences: Record<string, unknown>;
  listing_count?: number;
}

interface PaymentHistoryItem {
  id: string;
  amount_tokens: number;
  status: string;
  tx_hash: string;
  created_at: string;
  search_sessions?: { location_text: string };
}

const tabs: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: "searches", label: "Search History", icon: Search },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "saved", label: "Saved Listings", icon: Bookmark },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("searches");
  const [searches] = useState<SearchHistoryItem[]>([]);
  const [payments] = useState<PaymentHistoryItem[]>([]);
  const [savedListings] = useState<Listing[]>([]);
  const [loading] = useState(false);

  const statusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: typeof CheckCircle }> = {
      completed: { color: "text-success bg-success/10", icon: CheckCircle },
      paid: { color: "text-secondary bg-secondary/10", icon: CheckCircle },
      confirmed: { color: "text-success bg-success/10", icon: CheckCircle },
      pending: { color: "text-accent bg-accent/10", icon: Loader2 },
      failed: { color: "text-error bg-error/10", icon: XCircle },
    };
    const c = config[status] || config.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${c.color}`}
      >
        <c.icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-text-muted">
            Your search history, payments, and saved listings
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="mb-8 flex gap-1 rounded-xl border border-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:bg-bg"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Searches Tab */}
            {activeTab === "searches" && (
              <div className="space-y-3">
                {searches.length === 0 ? (
                  <EmptyState
                    message="No searches yet"
                    action="/search"
                    actionLabel="Start Searching"
                  />
                ) : (
                  searches.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-text">
                            {s.location_text}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(s.created_at)}
                            </span>
                            {s.listing_count !== undefined && (
                              <span>{s.listing_count} results</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {statusBadge(s.status)}
                        {s.status === "completed" && (
                          <Link
                            href={`/results?sessionId=${s.id}`}
                            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <EmptyState message="No payments yet" />
                ) : (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <CreditCard className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-text">
                            {p.amount_tokens} GOAT tokens
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(p.created_at)}
                            </span>
                            {p.search_sessions && (
                              <span>{p.search_sessions.location_text}</span>
                            )}
                          </div>
                          {p.tx_hash && (
                            <p className="mt-1 font-mono text-xs text-text-muted">
                              tx: {p.tx_hash.slice(0, 10)}...{p.tx_hash.slice(-6)}
                            </p>
                          )}
                        </div>
                      </div>
                      {statusBadge(p.status)}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Saved Tab */}
            {activeTab === "saved" && (
              <div>
                {savedListings.length === 0 ? (
                  <EmptyState
                    message="No saved listings"
                    action="/search"
                    actionLabel="Find Rentals"
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {savedListings.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {formatPropertyType(l.type)}
                          </span>
                          {l.validated && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                              AI Validated
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-text">{l.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">{l.address}</p>
                        <p className="mt-2 font-mono text-lg font-bold text-primary">
                          {formatRent(l.rent_min, l.rent_max)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  message,
  action,
  actionLabel,
}: {
  message: string;
  action?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface py-16 text-center">
      <p className="text-lg font-semibold text-text-muted">{message}</p>
      {action && actionLabel && (
        <Link
          href={action}
          className="mt-4 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
