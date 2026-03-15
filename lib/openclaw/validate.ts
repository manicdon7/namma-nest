import type { RawListing, ListingValidation } from "@/types/listing";
import { callOpenClaw } from "./agent";

function buildValidationPrompt(listing: RawListing, searchLocation: string): string {
  return `Validate this rental listing. Check:
1. Is the location "${listing.address}" real and matches the search area "${searchLocation}"?
2. Is the rent price ${listing.rent_min || "unknown"}-${listing.rent_max || "unknown"} INR/month realistic for this area in India?
3. Does the listing appear active (not expired)? Title: "${listing.title}"
4. Is contact information present? Contact: "${listing.contact || "none"}"
5. Is the source URL valid? URL: "${listing.source_url}"

Respond with ONLY a JSON object: { "valid": boolean, "reason": string, "confidence": number }
Where confidence is a number between 0 and 1.`;
}

function parseValidationResponse(response: string): ListingValidation {
  try {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      valid: Boolean(parsed.valid),
      reason: String(parsed.reason || ""),
      confidence: Number(parsed.confidence) || 0,
    };
  } catch {
    return { valid: true, reason: "Validation parse failed, defaulting to valid", confidence: 0.5 };
  }
}

export async function validateSingleListing(
  listing: RawListing,
  searchLocation: string
): Promise<{ listing: RawListing; validation: ListingValidation }> {
  try {
    const prompt = buildValidationPrompt(listing, searchLocation);
    const response = await callOpenClaw(prompt);
    const validation = parseValidationResponse(response);
    return { listing, validation };
  } catch {
    return {
      listing,
      validation: { valid: true, reason: "Validation skipped due to error", confidence: 0.5 },
    };
  }
}

export async function validateListings(
  listings: RawListing[],
  searchLocation: string,
  minConfidence = 0.6
): Promise<RawListing[]> {
  const validationPromises = listings.map((listing) =>
    validateSingleListing(listing, searchLocation)
  );

  const results = await Promise.allSettled(validationPromises);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ listing: RawListing; validation: ListingValidation }> =>
        r.status === "fulfilled"
    )
    .filter((r) => r.value.validation.valid && r.value.validation.confidence >= minConfidence)
    .map((r) => r.value.listing);
}
