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

export const LANDING_BUDGET_CHIPS = [
  "- de 100€",
  "100-300€",
  "300-500€",
  "500€+",
] as const;

export type LandingBudgetChip = (typeof LANDING_BUDGET_CHIPS)[number];

export type TattooFinderArtist = {
  slug: string;
  artist_name: string;
  studio: string | null;
  city: string | null;
  styles: string[];
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type TattooFinderAnswers = {
  style: LandingStyleChip;
  styleId: string | null;
  city: string;
  budget: LandingBudgetChip;
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

/**
 * Filtre client pour le style (complément au filtre Supabase sur le tableau).
 */
export function artistMatchesStyle(
  artistStyles: string[] | null,
  styleId: string | null,
): boolean {
  if (!styleId) return true;
  if (!artistStyles?.length) return false;
  const needle = styleId.toLowerCase();
  return artistStyles.some(
    (s) =>
      s.toLowerCase() === needle ||
      s.toLowerCase().includes(needle) ||
      styleIdToLabel(s).toLowerCase().includes(needle),
  );
}

export function buildTattooFinderQuery(
  supabase: ReturnType<
    typeof import("@/lib/supabase/client").createClientOrNull
  >,
  answers: TattooFinderAnswers,
) {
  if (!supabase) return null;

  const city = answers.city.trim();
  let query = supabase
    .from("pro_profiles_public")
    .select(
      "slug, artist_name, studio, city, styles, avatar_url, latitude, longitude",
    )
    .not("slug", "is", null)
    .ilike("city", `%${escapeIlike(city)}%`)
    .order("artist_name");

  if (answers.styleId) {
    query = query.contains("styles", [answers.styleId]);
  }

  return query;
}
