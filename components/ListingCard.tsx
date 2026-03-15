"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  ExternalLink,
  Phone,
  Bookmark,
  CheckCircle,
  Home,
  DoorOpen,
  Building,
} from "lucide-react";
import type { Listing } from "@/types/listing";
import { formatRent, formatPropertyType } from "@/lib/utils/formatter";

interface ListingCardProps {
  listing: Listing;
  index: number;
  onSave?: (id: string) => void;
  saved?: boolean;
}

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Home }> = {
  house: { color: "text-secondary", bg: "bg-secondary/10", icon: Home },
  pg: { color: "text-primary", bg: "bg-primary/10", icon: DoorOpen },
  apartment: { color: "text-blue-600", bg: "bg-blue-600/10", icon: Building },
};

export default function ListingCard({ listing, index, onSave, saved }: ListingCardProps) {
  const config = typeConfig[listing.type] || typeConfig.house;
  const TypeIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.color}`}
            >
              <TypeIcon className="h-3 w-3" />
              {formatPropertyType(listing.type)}
            </span>
            {listing.validated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
                <CheckCircle className="h-3 w-3" />
                AI Validated
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold leading-tight text-text">
            {listing.title}
          </h3>
        </div>
        {onSave && (
          <button
            onClick={() => onSave(listing.id)}
            className={`rounded-lg p-2 transition-colors ${
              saved
                ? "text-accent"
                : "text-text-muted hover:bg-accent/10 hover:text-accent"
            }`}
            aria-label={saved ? "Remove bookmark" : "Save listing"}
          >
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3 px-5 pb-4">
        <div className="flex items-start gap-2 text-sm text-text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{listing.address}</span>
        </div>

        <div className="font-mono text-2xl font-bold text-primary">
          {formatRent(listing.rent_min, listing.rent_max)}
        </div>

        {/* Amenities */}
        {listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.amenities.slice(0, 6).map((amenity) => (
              <span
                key={amenity}
                className="rounded-lg bg-bg px-2 py-1 text-xs text-text-muted"
              >
                {amenity}
              </span>
            ))}
            {listing.amenities.length > 6 && (
              <span className="rounded-lg bg-bg px-2 py-1 text-xs text-text-muted">
                +{listing.amenities.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        {listing.contact && (
          <a
            href={`tel:${listing.contact}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary/10 px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/20"
          >
            <Phone className="h-4 w-4" />
            Contact
          </a>
        )}
        <a
          href={listing.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
          View Source
        </a>
      </div>
    </motion.div>
  );
}
