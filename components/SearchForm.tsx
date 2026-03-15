"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Home,
  Building,
  DoorOpen,
  Search,
  Loader2,
} from "lucide-react";
import type { SearchPreferences, SearchPropertyType } from "@/types/search";

interface SearchFormProps {
  onSubmit: (data: {
    location: string;
    latitude?: number;
    longitude?: number;
    type: SearchPropertyType;
    budgetMin: number;
    budgetMax: number;
    preferences: SearchPreferences;
  }) => void;
  loading?: boolean;
}

const propertyTypes: { value: SearchPropertyType; label: string; icon: typeof Home }[] = [
  { value: "house", label: "House", icon: Home },
  { value: "pg", label: "PG", icon: DoorOpen },
  { value: "any", label: "Any", icon: Building },
];

export default function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [propertyType, setPropertyType] = useState<SearchPropertyType>("any");
  const [budgetMin, setBudgetMin] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(30000);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [furnishing, setFurnishing] = useState<SearchPreferences["furnishing"]>("any");
  const [gender, setGender] = useState<SearchPreferences["gender"]>("any");
  const [parking, setParking] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [food, setFood] = useState(false);
  const [ac, setAc] = useState(false);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLatitude(lat);
        setLongitude(lon);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { "User-Agent": "NammaNest/1.0" } }
          );
          const data = await res.json();
          const addr = data.address;
          const parts = [
            addr.neighbourhood || addr.suburb,
            addr.city || addr.town,
          ].filter(Boolean);
          setLocation(parts.join(", ") || data.display_name);
        } catch {
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    onSubmit({
      location: location.trim(),
      latitude,
      longitude,
      type: propertyType,
      budgetMin,
      budgetMax,
      preferences: { furnishing, gender, parking, wifi, food, ac },
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6"
    >
      {/* Location */}
      <div>
        <label className="mb-2 block font-display text-sm font-semibold text-text">
          Location
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="e.g. Koramangala, Bengaluru"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Use GPS</span>
          </button>
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="mb-2 block font-display text-sm font-semibold text-text">
          Property Type
        </label>
        <div className="flex gap-2">
          {propertyTypes.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setPropertyType(pt.value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                propertyType === pt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-text-muted hover:border-primary/50"
              }`}
            >
              <pt.icon className="h-4 w-4" />
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="mb-2 block font-display text-sm font-semibold text-text">
          Budget Range
        </label>
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Min</span>
            <span className="font-mono text-sm font-semibold text-primary">
              ₹{budgetMin.toLocaleString("en-IN")}
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={100000}
            step={1000}
            value={budgetMin}
            onChange={(e) => {
              const val = Number(e.target.value);
              setBudgetMin(val);
              if (val > budgetMax) setBudgetMax(val);
            }}
            className="w-full accent-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Max</span>
            <span className="font-mono text-sm font-semibold text-primary">
              ₹{budgetMax.toLocaleString("en-IN")}
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={200000}
            step={1000}
            value={budgetMax}
            onChange={(e) => {
              const val = Number(e.target.value);
              setBudgetMax(val);
              if (val < budgetMin) setBudgetMin(val);
            }}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* Preferences */}
      <div>
        <label className="mb-2 block font-display text-sm font-semibold text-text">
          Preferences
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <select
            value={furnishing}
            onChange={(e) =>
              setFurnishing(e.target.value as SearchPreferences["furnishing"])
            }
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="any">Any Furnishing</option>
            <option value="furnished">Furnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
          <select
            value={gender}
            onChange={(e) =>
              setGender(e.target.value as SearchPreferences["gender"])
            }
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="any">Any Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {[
            { key: "parking", label: "Parking", state: parking, set: setParking },
            { key: "wifi", label: "WiFi", state: wifi, set: setWifi },
            { key: "food", label: "Food/Meals", state: food, set: setFood },
            { key: "ac", label: "AC", state: ac, set: setAc },
          ].map((pref) => (
            <button
              key={pref.key}
              type="button"
              onClick={() => pref.set(!pref.state)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                pref.state
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border bg-surface text-text-muted hover:border-secondary/50"
              }`}
            >
              {pref.state ? "✓ " : ""}
              {pref.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={loading || !location.trim()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Search className="h-5 w-5" />
        )}
        {loading ? "Processing..." : "Search with AI"}
      </motion.button>
    </motion.form>
  );
}
