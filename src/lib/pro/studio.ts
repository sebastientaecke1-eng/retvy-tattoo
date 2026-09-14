import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getMaxArtists } from "@/lib/stripe/plans";
import type { PlanTier } from "@/lib/stripe/plans";

// ─── Fonctions utilitaires studio/localisation (existantes) ──────────────────

export type StudioLocationFields = {
  studio?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
};

export function formatCityPostal(
  city?: string | null,
  postalCode?: string | null,
): string | null {
  const c = city?.trim();
  const p = postalCode?.trim();
  if (!c) return null;
  return p ? `${c}, ${p}` : c;
}

export function formatStudioAddress(fields: StudioLocationFields): string {
  const cityLine = formatCityPostal(fields.city, fields.postal_code);
  return [fields.address, cityLine].filter(Boolean).join(", ");
}

export function buildMapsSearchQuery(
  fields: StudioLocationFields,
): string | null {
  const studio = fields.studio?.trim() ?? "";
  const address = fields.address?.trim() ?? "";
  const city = fields.city?.trim() ?? "";
  const postal = fields.postal_code?.trim() ?? "";
  const locality = [postal, city].filter(Boolean).join(" ");
  const parts = studio
    ? [studio, address, locality].filter(Boolean)
    : [address, locality].filter(Boolean);
  const query = parts.join(" ").trim();
  return query || null;
}

export function buildGoogleMapsEmbedUrl(
  fields: StudioLocationFields,
): string | null {
  const search = buildMapsSearchQuery(fields);
  if (!search) return null;
  const q = encodeURIComponent(search);
  return `https://maps.google.com/maps?q=${q}&hl=fr&z=16&iwloc=near&output=embed`;
}

export function buildGoogleMapsOpenUrl(
  fields: StudioLocationFields,
): string | null {
  const search = buildMapsSearchQuery(fields);
  if (!search) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
}

export function hasStudioSection(
  fields: StudioLocationFields,
  photoCount: number,
): boolean {
  return (
    photoCount > 0 ||
    !!fields.studio?.trim() ||
    !!formatStudioAddress(fields) ||
    !!buildGoogleMapsEmbedUrl(fields)
  );
}

export const MAX_STUDIO_PHOTOS = 5;

// ─── Gestion multi-profils (nouveau) ─────────────────────────────────────────

export type StudioProfile = {
  id: string;
  user_id: string;
  artist_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  is_sub_profile: boolean;
  studio_owner_id: string | null;
};

/** Tous les profils du studio (principal + sous-profils). */
export async function getStudioProfiles(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<StudioProfile[]> {
  const { data, error } = await admin
    .from("pro_profiles")
    .select("id, user_id, artist_name, slug, avatar_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getStudioProfiles]", error.message);
    return [];
  }

  // is_sub_profile et studio_owner_id pas encore dans les types TS —
  // on les lit depuis le raw et on cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    artist_name: row.artist_name,
    slug: row.slug,
    avatar_url: row.avatar_url,
    is_sub_profile: row.is_sub_profile ?? false,
    studio_owner_id: row.studio_owner_id ?? null,
  }));
}

/** Vérifie si le studio peut encore ajouter un artiste. */
export function canAddArtist(currentCount: number, tier: PlanTier): boolean {
  return currentCount < getMaxArtists(tier);
}

/** Crée un sous-profil artiste pour un studio, en héritant des infos du profil propriétaire. */
export async function createSubProfile(
  admin: SupabaseClient<Database>,
  ownerId: string,
  data: { artist_name: string; slug: string },
): Promise<{ id: string } | null> {
  // Récupérer les infos du profil principal pour pré-remplir studio, ville, adresse et téléphone
  const { data: ownerProfile } = await admin
    .from("pro_profiles")
    .select("studio, city, address, postal_code, phone")
    .eq("user_id", ownerId)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const { data: profile, error } = await admin
    .from("pro_profiles")
    .insert({
      user_id: ownerId,
      studio_owner_id: ownerId,
      is_sub_profile: true,
      artist_name: data.artist_name,
      slug: data.slug,
      status: "active",
      // Hérité du profil principal
      studio: ownerProfile?.studio ?? null,
      city: ownerProfile?.city ?? "",
      address: ownerProfile?.address ?? null,
      postal_code: ownerProfile?.postal_code ?? null,
      phone: ownerProfile?.phone ?? "",
      // À remplir par l'artiste
      first_name: "",
      last_name: "",
      styles: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createSubProfile]", error.message, error.code, error.details);
    return null;
  }
  return profile;
}
