const GOUV_BASE = "https://api-adresse.data.gouv.fr/search";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Retvy/1.0 (https://retvy.fr)";

export type GeocodeResult = {
  lat: number;
  lon: number;
  provider: "gouv" | "nominatim";
};

type NominatimHit = {
  lat?: string;
  lon?: string;
};

type GouvResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
  }>;
};

async function geocodeWithNominatim(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("[geocodeAddress] Nominatim HTTP", {
        status: res.status,
        query,
      });
      return null;
    }

    const hits = (await res.json()) as NominatimHit[];
    const hit = hits[0];
    if (!hit?.lat || !hit?.lon) {
      console.warn("[geocodeAddress] Nominatim empty result", { query });
      return null;
    }

    const lat = Number.parseFloat(hit.lat);
    const lon = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon, provider: "nominatim" };
  } catch (error) {
    console.error("[geocodeAddress] Nominatim fetch error", {
      query,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

async function geocodeWithGouv(query: string): Promise<GeocodeResult | null> {
  const url = `${GOUV_BASE}/?q=${encodeURIComponent(query)}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error("[geocodeAddress] Gouv HTTP", {
        status: res.status,
        query,
      });
      return null;
    }

    const data = (await res.json()) as GouvResponse;
    const coordinates = data.features?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) {
      console.warn("[geocodeAddress] Gouv empty result", { query });
      return null;
    }

    const [lon, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon, provider: "gouv" };
  } catch (error) {
    console.error("[geocodeAddress] Gouv fetch error", {
      query,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

/**
 * Géocode une adresse : Nominatim puis API adresse data.gouv.fr (fallback).
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  console.log("[geocodeAddress] start", { query });

  const nominatim = await geocodeWithNominatim(query);
  if (nominatim) {
    console.log("[geocodeAddress] success", {
      query,
      provider: nominatim.provider,
      lat: nominatim.lat,
      lon: nominatim.lon,
    });
    return nominatim;
  }

  const gouv = await geocodeWithGouv(query);
  if (gouv) {
    console.log("[geocodeAddress] success", {
      query,
      provider: gouv.provider,
      lat: gouv.lat,
      lon: gouv.lon,
    });
    return gouv;
  }

  console.warn("[geocodeAddress] all providers failed", { query });
  return null;
}

/** Géocode une ville en France. */
export async function geocodeCity(
  city: string,
): Promise<GeocodeResult | null> {
  const trimmed = city.trim();
  if (!trimmed) return null;
  return geocodeAddress(`${trimmed}, France`);
}

/**
 * Construit la requête de géocodage : adresse + code postal + ville.
 */
export function buildProfileGeocodeQuery(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}): string | null {
  const address = parts.address?.trim() ?? "";
  const postalCode = parts.postal_code?.trim() ?? "";
  const city = parts.city?.trim() ?? "";

  const line = [address, [postalCode, city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return line || null;
}
