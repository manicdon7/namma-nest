import type { SearchParams } from "@/types/search";
import type { RawListing } from "@/types/listing";
import { searchRentals } from "./search";
import { validateListings } from "./validate";
import { isLlmConfigured } from "@/lib/llm/client";

/** Mock listings for development when GEMINI_API_KEY is not configured */
function getMockListings(params: SearchParams): RawListing[] {
  return [
    {
      title: "2BHK Apartment in " + params.location,
      type: "apartment",
      address: params.location + ", India",
      rent_min: params.budgetMin,
      rent_max: params.budgetMax,
      amenities: ["WiFi", "Parking", "Furnished"],
      contact: "+91 98765 43210",
      source_url: "https://www.nobroker.in",
      listing_date: new Date().toISOString().split("T")[0],
    },
    {
      title: "PG for Working Professionals",
      type: "pg",
      address: params.location + ", India",
      rent_min: Math.min(params.budgetMin, 8000),
      rent_max: Math.min(params.budgetMax, 15000),
      amenities: ["WiFi", "Food", "AC"],
      contact: null,
      source_url: "https://www.99acres.com",
      listing_date: new Date().toISOString().split("T")[0],
    },
    {
      title: "Independent House",
      type: "house",
      address: params.location + ", India",
      rent_min: params.budgetMin + 5000,
      rent_max: params.budgetMax + 5000,
      amenities: ["Parking", "Furnished", "Garden"],
      contact: "contact@example.com",
      source_url: "https://www.magicbricks.com",
      listing_date: new Date().toISOString().split("T")[0],
    },
  ];
}

export async function runNammaNestAgent(params: SearchParams): Promise<RawListing[]> {
  const useMock = process.env.USE_MOCK_SEARCH === "true" || !isLlmConfigured();

  if (useMock) {
    return getMockListings(params);
  }

  const rawListings = await searchRentals(params);
  if (rawListings.length === 0) return [];

  const validatedListings = await validateListings(rawListings, params.location);
  return validatedListings;
}
