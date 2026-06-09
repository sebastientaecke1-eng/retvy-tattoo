import type { PostgrestError } from "@supabase/supabase-js";
import { PRO_STYLE_OPTIONS } from "@/lib/pro/styles";

export const LANDING_STYLE_CHIPS = [
  { label: "Japonais", styleId: "japonais" as const },
  { label: "Réaliste", styleId: "realisme" as const },
  { label: "Tribal", styleId: "tribal" as const },
  { label: "Minimaliste", styleId: "minimaliste" as const },
  { label: "Old School", styleId: "old-school" as const },
  { label: "Autre", styleId: null },
] as const;

export type LandingStyleChip = (typeof LANDING_STYLE_CHIPS)[number]["label"];

export type TattooFinderArtist = {
  id: string | null;
  slug: string;
  artist_name: string;
  city: string | null;
  styles: string[];
  latitude: number | null;
  longitude: number | null;
};

export type TattooFinderAnswers = {
  style: LandingStyleChip;
  styleId: string | null;
  city: string;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

export function styleIdToLabel(styleId: string): string {
  const opt = PRO_STYLE_OPTIONS.find((o) => o.id === styleId);
  return opt?.label ?? styleId;
}

export function resolveLandingStyleId(
  style: LandingStyleChip,
): string | null {
  const chip = LANDING_STYLE_CHIPS.find((c) => c.label === style);
  return chip?.styleId ?? null;
}

function filterByStyle(
  pros: TattooFinderArtist[],
  styleId: string | null,
): TattooFinderArtist[] {
  if (!styleId) return pros;
  return pros.filter(
    (p) => p.styles && p.styles.includes(styleId),
  );
}

type SupabaseClient = NonNullable<
  ReturnType<typeof import("@/lib/supabase/client").createClientOrNull>
>;

function isMissingGeoColumnError(error: PostgrestError): boolean {
  const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return msg.includes("latitude") || msg.includes("longitude");
}

export async function fetchTattooFinderArtists(
  supabase: SupabaseClient,
  answers: TattooFinderAnswers,
): Promise<{ data: TattooFinderArtist[] | null; error: PostgrestError | null }> {
  const city = answers.city.trim();
  const styleId = answers.styleId;

  let query = supabase
    .from("pro_profiles_public")
    .select("user_id, slug, artist_name, city, styles, latitude, longitude")
    .not("slug", "is", null)
    .order("artist_name");

  if (city) {
    query = query.ilike("city", `%${escapeIlike(city)}%`);
  }

  let { data, error } = await query;

  if (error && isMissingGeoColumnError(error)) {
    let fallbackQuery = supabase
      .from("pro_profiles_public")
      .select("user_id, slug, artist_name, city, styles")
      .not("slug", "is", null)
      .order("artist_name");

    if (city) {
      fallbackQuery = fallbackQuery.ilike("city", `%${escapeIlike(city)}%`);
    }

    const fallback = await fallbackQuery;
    data = fallback.data?.map((row) => ({
      ...row,
      latitude: null,
      longitude: null,
    })) ?? null;
    error = fallback.error;
  }

  if (error) {
    return { data: null, error };
  }

  const pros: TattooFinderArtist[] = (data ?? [])
    .filter(
      (row): row is typeof row & { slug: string; artist_name: string } =>
        typeof row.slug === "string" &&
        row.slug.length > 0 &&
        typeof row.artist_name === "string" &&
        row.artist_name.length > 0,
    )
    .map((row) => ({
      id: row.user_id ?? null,
      slug: row.slug,
      artist_name: row.artist_name,
      city: row.city,
      styles: row.styles ?? [],
      latitude: typeof row.latitude === "number" ? row.latitude : null,
      longitude: typeof row.longitude === "number" ? row.longitude : null,
    }));

  return { data: filterByStyle(pros, styleId), error: null };
}
