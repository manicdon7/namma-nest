import type { Listing } from "@/types/listing";

export function formatRent(min: number | null | undefined, max: number | null | undefined): string {
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (!hasMin && !hasMax) return "Price on request";
  if (hasMin && hasMax && min === max) return `₹${Number(min).toLocaleString("en-IN")}/mo`;
  if (hasMin && hasMax) {
    return `₹${Number(min).toLocaleString("en-IN")} – ₹${Number(max).toLocaleString("en-IN")}/mo`;
  }
  if (hasMin) return `₹${Number(min).toLocaleString("en-IN")}+/mo`;
  return `Up to ₹${Number(max).toLocaleString("en-IN")}/mo`;
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

export function getMapUrl(address: string): string {
  const query = address.includes("India") ? address : `${address}, India`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatListingForTelegram(listing: Listing, index: number): string {
  const typeEmoji = listing.type === "pg" ? "🛏" : listing.type === "apartment" ? "🏢" : "🏠";
  const rent = formatRent(listing.rent_min, listing.rent_max);
  const amenities =
    listing.amenities.length > 0 ? listing.amenities.slice(0, 5).join(", ") : "Not specified";
  const validated = listing.validated ? "✅ AI Validated" : "⚠️ Unverified";
  const contact = listing.contact ? `📞 Contact: ${listing.contact}` : "";
  const mapUrl = getMapUrl(listing.address);

  return [
    `${typeEmoji} *${index}. ${escapeMarkdown(listing.title)}*`,
    `📍 [${escapeMarkdown(listing.address)}](${mapUrl})`,
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
