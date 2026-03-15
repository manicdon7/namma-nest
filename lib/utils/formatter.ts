import type { Listing } from "@/types/listing";

export function formatRent(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Price on request";
  if (min !== null && max !== null && min === max) return `₹${min.toLocaleString("en-IN")}/mo`;
  if (min !== null && max !== null) {
    return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}/mo`;
  }
  if (min !== null) return `₹${min.toLocaleString("en-IN")}+/mo`;
  return `Up to ₹${max!.toLocaleString("en-IN")}/mo`;
}

export function formatPropertyType(type: string): string {
  switch (type) {
    case "pg":
      return "PG";
    case "house":
      return "House";
    case "apartment":
      return "Apartment";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function formatListingForTelegram(listing: Listing, index: number): string {
  const typeEmoji = listing.type === "pg" ? "🛏" : listing.type === "apartment" ? "🏢" : "🏠";
  const rent = formatRent(listing.rent_min, listing.rent_max);
  const amenities =
    listing.amenities.length > 0 ? listing.amenities.slice(0, 5).join(", ") : "Not specified";
  const validated = listing.validated ? "✅ AI Validated" : "⚠️ Unverified";
  const contact = listing.contact ? `📞 Contact: ${listing.contact}` : "";

  return [
    `${typeEmoji} *${index}. ${escapeMarkdown(listing.title)}*`,
    `📍 ${escapeMarkdown(listing.address)}`,
    `💰 ${rent}`,
    `🏷 ${amenities}`,
    validated,
    contact,
    `🔗 [View Listing](${listing.source_url})`,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
