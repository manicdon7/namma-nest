export type SearchPropertyType = "house" | "pg" | "any";
export type SessionStatus = "pending" | "paid" | "completed" | "failed";

export interface SearchPreferences {
  furnishing?: "furnished" | "semi-furnished" | "unfurnished" | "any";
  gender?: "male" | "female" | "any";
  parking?: boolean;
  wifi?: boolean;
  food?: boolean;
  ac?: boolean;
}

export interface SearchQuery {
  sessionId: string;
  location: string;
  latitude?: number;
  longitude?: number;
  type: SearchPropertyType;
  budgetMin: number;
  budgetMax: number;
  preferences: SearchPreferences;
}

export interface SearchSession {
  id: string;
  user_id: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  preferences: SearchPreferences;
  status: SessionStatus;
  created_at: string;
}

export interface SearchParams {
  location: string;
  latitude?: number;
  longitude?: number;
  type: SearchPropertyType;
  budgetMin: number;
  budgetMax: number;
  preferences: SearchPreferences;
}
