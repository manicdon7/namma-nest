export type PropertyType = "house" | "pg" | "apartment";

export interface Listing {
  id: string;
  session_id: string;
  title: string;
  type: PropertyType;
  address: string;
  rent_min: number | null;
  rent_max: number | null;
  amenities: string[];
  contact: string | null;
  source_url: string;
  validated: boolean;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface ListingValidation {
  valid: boolean;
  reason: string;
  confidence: number;
}

export interface RawListing {
  title: string;
  type: PropertyType;
  address: string;
  rent_min?: number | null;
  rent_max?: number | null;
  amenities?: string[];
  contact?: string | null;
  source_url: string;
  listing_date?: string;
}
