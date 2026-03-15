"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, Home, DoorOpen, Building, Grid3X3 } from "lucide-react";
import type { Listing } from "@/types/listing";
import ListingCard from "./ListingCard";

interface ListingsGridProps {
  listings: Listing[];
  onSave?: (id: string) => void;
  savedIds?: Set<string>;
}

type SortOption = "rent-asc" | "rent-desc" | "newest";
type FilterType = "all" | "house" | "pg" | "apartment";

export default function ListingsGrid({ listings, onSave, savedIds }: ListingsGridProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    let result = [...listings];

    if (filterType !== "all") {
      result = result.filter((l) => l.type === filterType);
    }

    result.sort((a, b) => {
      switch (sort) {
        case "rent-asc":
          return (a.rent_min || 0) - (b.rent_min || 0);
        case "rent-desc":
          return (b.rent_min || 0) - (a.rent_min || 0);
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [listings, sort, filterType]);

  const typeFilters: { value: FilterType; label: string; icon: typeof Home }[] = [
    { value: "all", label: "All", icon: Grid3X3 },
    { value: "house", label: "House", icon: Home },
    { value: "pg", label: "PG", icon: DoorOpen },
    { value: "apartment", label: "Apt", icon: Building },
  ];

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-text-muted" />
          <div className="flex gap-1">
            {typeFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filterType === f.value
                    ? "bg-primary text-white"
                    : "bg-bg text-text-muted hover:bg-primary/10"
                }`}
              >
                <f.icon className="h-3 w-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="rent-asc">Rent: Low to High</option>
            <option value="rent-desc">Rent: High to Low</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <p className="mb-4 text-sm text-text-muted">
        Showing {filtered.length} of {listings.length} listings
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((listing, i) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              index={i}
              onSave={onSave}
              saved={savedIds?.has(listing.id)}
            />
          ))}
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center">
          <p className="text-lg font-semibold text-text-muted">No listings found</p>
          <p className="mt-1 text-sm text-text-muted">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
