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

/**
 * Géocode l'adresse du pro et retourne latitude/longitude à persister.
 * One-shot pour les pros existants sans coordonnées au prochain save.
 */
export async function resolveProfileCoordinates(
  _admin: AdminClient,
  userId: string,
  patch: ProfileGeoFields,
  existing?: ProfileGeoFields | null,
): Promise<{ latitude: number | null; longitude: number | null }> {
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

  if (!needsGeocode) {
    return {
      latitude: merged.latitude,
      longitude: merged.longitude,
    };
  }

  const query = buildProfileGeocodeQuery(merged);
  if (!query) {
    return { latitude: null, longitude: null };
  }

  const coords = await geocodeAddress(query);
  if (!coords) {
    console.warn("[resolveProfileCoordinates] geocode failed", {
      userId,
      query,
    });
    return {
      latitude: merged.latitude,
      longitude: merged.longitude,
    };
  }

  return { latitude: coords.lat, longitude: coords.lon };
}
