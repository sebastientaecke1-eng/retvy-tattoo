const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Retvy/1.0 (https://retvy.fr)";

export type GeocodeResult = {
  lat: number;
  lon: number;
};

type NominatimHit = {
  lat?: string;
  lon?: string;
};

/**
 * Géocode une adresse via Nominatim (OpenStreetMap, sans clé API).
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("[geocodeAddress] Nominatim HTTP", res.status);
    return null;
  }

  const hits = (await res.json()) as NominatimHit[];
  const hit = hits[0];
  if (!hit?.lat || !hit?.lon) return null;

  const lat = Number.parseFloat(hit.lat);
  const lon = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

/**
 * Construit une chaîne d'adresse à partir des champs profil pro.
 */
export function buildProfileGeocodeQuery(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}): string | null {
  const segments = [parts.address, parts.postal_code, parts.city]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));

  return segments.length > 0 ? segments.join(", ") : null;
}
