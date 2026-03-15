"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import ListingsGrid from "@/components/ListingsGrid";
import LoadingAgent from "@/components/LoadingAgent";
import type { Listing } from "@/types/listing";

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const location = searchParams.get("location");
  const type = searchParams.get("type");
  const budgetMin = searchParams.get("budgetMin");
  const budgetMax = searchParams.get("budgetMax");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchResults = useCallback(async () => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          location: location || "",
          type: type || "any",
          budgetMin: Number(budgetMin) || 5000,
          budgetMax: Number(budgetMax) || 50000,
          preferences: {},
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      setListings(data.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [sessionId, location, type, budgetMin, budgetMax]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSave = (listingId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
  };

  if (loading) return <LoadingAgent />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <AlertCircle className="mb-4 h-16 w-16 text-error" />
        <h2 className="font-display text-xl font-bold text-text">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/search"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Try Again
          </Link>
          <a
            href="mailto:support@nammanest.com"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/search"
            className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            New Search
          </Link>
          <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">
            Search Results
          </h1>
          {location && (
            <p className="mt-1 text-text-muted">
              Rentals near <span className="font-semibold text-text">{location}</span>
            </p>
          )}
        </motion.div>

        {listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-surface py-16 text-center"
          >
            <h3 className="font-display text-xl font-semibold text-text">
              No listings found
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Try a broader area or adjust your budget range.
            </p>
            <Link
              href="/search"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Search Again
            </Link>
          </motion.div>
        ) : (
          <ListingsGrid
            listings={listings}
            onSave={handleSave}
            savedIds={savedIds}
          />
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingAgent />}>
      <ResultsContent />
    </Suspense>
  );
}
