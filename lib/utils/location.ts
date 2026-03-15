export interface GeoLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeLocation(query: string): Promise<GeoLocation | null> {
  try {
    const encoded = encodeURIComponent(query + ", India");
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`,
      {
        headers: { "User-Agent": "NammaNest/1.0" },
      }
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (results.length === 0) return null;

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: { "User-Agent": "NammaNest/1.0" },
      }
    );

    if (!response.ok) return null;

    const result = await response.json();
    const addr = result.address;

    const parts = [
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.village,
      addr.state,
    ].filter(Boolean);

    return parts.join(", ") || result.display_name || null;
  } catch {
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
