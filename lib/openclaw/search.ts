import type { SearchParams } from "@/types/search";
import type { RawListing, PropertyType } from "@/types/listing";
import { callLlm } from "@/lib/llm/client";

function buildSearchPrompt(params: SearchParams): string {
  const typeLabel =
    params.type === "any"
      ? "house, PG, or apartment"
      : params.type === "pg"
        ? "PG (Paying Guest)"
        : params.type;

  const prefsLines: string[] = [];
  if (params.preferences.furnishing && params.preferences.furnishing !== "any") {
    prefsLines.push(`Furnishing: ${params.preferences.furnishing}`);
  }
  if (params.preferences.gender && params.preferences.gender !== "any") {
    prefsLines.push(`Gender preference: ${params.preferences.gender}`);
  }
  if (params.preferences.parking) prefsLines.push("Parking required");
  if (params.preferences.wifi) prefsLines.push("WiFi required");
  if (params.preferences.food) prefsLines.push("Food/meals included");
  if (params.preferences.ac) prefsLines.push("AC required");

  const prefsText = prefsLines.length > 0 ? prefsLines.join("\n") : "No specific preferences";

  return `You are Namma Nest's rental search agent.
Search for ${typeLabel} rentals near ${params.location}.
Budget range: ${params.budgetMin}-${params.budgetMax} INR/month.
Preferences:
${prefsText}

Search across NoBroker, 99acres, MagicBricks, Housing.com, OLX, Sulekha, and local classifieds.

For each listing found, extract:
- title: descriptive title of the listing
- type: one of "house", "pg", or "apartment"
- address: full address including area and city
- rent_min: minimum rent amount in INR (number)
- rent_max: maximum rent amount in INR (number, same as rent_min if fixed price)
- amenities: array of amenity strings (e.g. ["WiFi", "AC", "Parking", "Furnished"])
- contact: phone number or email if available
- source_url: URL of the original listing
- listing_date: date the listing was posted if available

Return only currently available listings.
Return results as a JSON array of objects with the fields above.
Return at most 15 listings.`;
}

function parseListingsResponse(response: string): RawListing[] {
  try {
    let jsonStr = response.trim();

    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const items = Array.isArray(parsed) ? parsed : parsed.listings || parsed.results || [];

    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title || "Untitled Listing"),
      type: normalizePropertyType(item.type as string),
      address: String(item.address || "Address not specified"),
      rent_min: parseNumber(item.rent_min || item.rentMin || item.rent),
      rent_max: parseNumber(item.rent_max || item.rentMax || item.rent),
      amenities: parseAmenities(item.amenities),
      contact: item.contact ? String(item.contact) : null,
      source_url: String(item.source_url || item.sourceUrl || item.url || "#"),
      listing_date: item.listing_date ? String(item.listing_date) : undefined,
    }));
  } catch {
    console.error("Failed to parse LLM response:", response.substring(0, 200));
    return [];
  }
}

function normalizePropertyType(type: string | undefined): PropertyType {
  if (!type) return "house";
  const lower = type.toLowerCase();
  if (lower.includes("pg") || lower.includes("paying guest")) return "pg";
  if (lower.includes("apartment") || lower.includes("flat")) return "apartment";
  return "house";
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function parseAmenities(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function searchRentals(params: SearchParams): Promise<RawListing[]> {
  const prompt = buildSearchPrompt(params);
  const response = await callLlm(prompt);
  return parseListingsResponse(response);
}
