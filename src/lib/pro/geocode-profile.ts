import {
  buildProfileGeocodeQuery,
  geocodeAddress,
} from "@/lib/geocode";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type ProfileGeoFields = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type ResolvedProfileCoordinates = {
  latitude: number | null;
  longitude: number | null;
  geocodeQuery: string | null;
  geocoded: boolean;
  provider: "gouv" | "nominatim" | null;
};

/**
 * Géocode l'adresse du pro et retourne latitude/longitude à persister.
 * One-shot pour les pros existants sans coordonnées au prochain save.
 */
export async function resolveProfileCoordinates(
  _admin: AdminClient,
  userId: string,
  patch: ProfileGeoFields,
  existing?: ProfileGeoFields | null,
): Promise<ResolvedProfileCoordinates> {
  const merged = {
    address: patch.address ?? existing?.address ?? null,
    postal_code: patch.postal_code ?? existing?.postal_code ?? null,
    city: patch.city ?? existing?.city ?? null,
    latitude: patch.latitude ?? existing?.latitude ?? null,
    longitude: patch.longitude ?? existing?.longitude ?? null,
  };

  const addressChanged =
    patch.address !== undefined ||
    patch.postal_code !== undefined ||
    patch.city !== undefined;

  const needsGeocode =
    addressChanged || merged.latitude == null || merged.longitude == null;

  const geocodeQuery = buildProfileGeocodeQuery(merged);

  if (!needsGeocode) {
    return {
      latitude: merged.latitude,
      longitude: merged.longitude,
      geocodeQuery,
      geocoded: false,
      provider: null,
    };
  }

  if (!geocodeQuery) {
    console.warn("[resolveProfileCoordinates] no address to geocode", {
      userId,
      merged,
    });
    return {
      latitude: null,
      longitude: null,
      geocodeQuery: null,
      geocoded: false,
      provider: null,
    };
  }

  console.log("[resolveProfileCoordinates] geocoding", {
    userId,
    geocodeQuery,
    addressChanged,
    needsGeocode,
  });

  try {
    const coords = await geocodeAddress(geocodeQuery);

    if (!coords) {
      console.warn("[resolveProfileCoordinates] geocode failed", {
        userId,
        geocodeQuery,
      });
      return {
        latitude: merged.latitude,
        longitude: merged.longitude,
        geocodeQuery,
        geocoded: false,
        provider: null,
      };
    }

    console.log("[resolveProfileCoordinates] geocode ok", {
      userId,
      geocodeQuery,
      provider: coords.provider,
      latitude: coords.lat,
      longitude: coords.lon,
    });

    return {
      latitude: coords.lat,
      longitude: coords.lon,
      geocodeQuery,
      geocoded: true,
      provider: coords.provider,
    };
  } catch (error) {
    console.error("[resolveProfileCoordinates] unexpected error", {
      userId,
      geocodeQuery,
      error: error instanceof Error ? error.message : error,
    });
    return {
      latitude: merged.latitude,
      longitude: merged.longitude,
      geocodeQuery,
      geocoded: false,
      provider: null,
    };
  }
}
