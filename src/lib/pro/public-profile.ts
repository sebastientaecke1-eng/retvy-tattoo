import { PRO_STYLE_OPTIONS } from "@/lib/pro/styles";
import type { TattooStyleCatalog } from "@/lib/pro/tattoo-style-catalog";
import {
  fetchProPublicStyles,
  fetchTattooStyleCatalogAdmin,
  styleLabelFromCatalog,
  type ProPublicStyles,
} from "@/lib/pro/tattoo-style-catalog";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicProProfile =
  Database["public"]["Views"]["pro_profiles_public"]["Row"] & {
    address?: string | null;
    postal_code?: string | null;
  };

export type PublicStudioPhoto = {
  id: string;
  image_url: string;
};

export type PublicPortfolioItem = {
  id: string;
  style: string;
  image_url: string;
};

export type PortfolioStyleGroup = {
  style: string;
  label: string;
  images: PublicPortfolioItem[];
};

/** Colonnes lues depuis pro_profiles (source de vérité, dont avatar_url). */
const PUBLIC_PROFILE_COLUMNS =
  "id, user_id, slug, artist_name, studio, avatar_url, cover_url, bio, city, address, postal_code, price_min, price_max, status, styles" as const;

export function styleLabel(
  styleId: string,
  catalog?: TattooStyleCatalog | null,
): string {
  const fromCatalog = styleLabelFromCatalog(styleId, catalog);
  if (fromCatalog) return fromCatalog;
  const fromOptions = PRO_STYLE_OPTIONS.find((o) => o.id === styleId)?.label;
  if (fromOptions) return fromOptions;
  // Fallback: formater le slug catalogue ("japonais_traditionnel" → "Japonais traditionnel")
  return styleId
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Profil public pour /ink/[slug].
 * Lit toujours pro_profiles via service role (avatar_url à jour).
 * La vue pro_profiles_public sert uniquement de repli.
 */
export async function fetchPublicProProfileBySlug(
  slug: string,
): Promise<(PublicProProfile & { id?: string }) | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const admin = createAdminClient();

  const { data: row, error: profileError } = await admin
    .from("pro_profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("slug", normalized)
    .maybeSingle();

  if (profileError) {
    console.warn("[ink] pro_profiles:", profileError.message);
  }

  if (row?.artist_name) {
    return row as PublicProProfile & { id: string };
  }

  const { data: viaView, error: viewError } = await admin
    .from("pro_profiles_public")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (viewError) {
    console.warn("[ink] pro_profiles_public:", viewError.message);
  }

  if (!viaView?.artist_name) return null;

  if (viaView.user_id) {
    const { data: extra } = await admin
      .from("pro_profiles")
      .select("id, address, postal_code, avatar_url")
      .eq("user_id", viaView.user_id)
      .maybeSingle();
    return {
      ...viaView,
      id: extra?.id,
      address: extra?.address ?? null,
      postal_code: extra?.postal_code ?? null,
      avatar_url: extra?.avatar_url ?? viaView.avatar_url,
    };
  }

  return viaView;
}

export async function fetchPublicPortfolioByUserId(
  userId: string,
): Promise<PublicPortfolioItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_portfolio")
    .select("id, style, image_url, position")
    .eq("user_id", userId)
    .order("style")
    .order("position", { ascending: true });

  if (error) {
    console.warn("[ink] pro_portfolio:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    style: row.style,
    image_url: row.image_url,
  }));
}

export function groupPortfolioByStyle(
  items: PublicPortfolioItem[],
  profileStyleSlugs?: string[] | null,
  catalog?: TattooStyleCatalog | null,
): PortfolioStyleGroup[] {
  const byStyle = new Map<string, PublicPortfolioItem[]>();
  for (const item of items) {
    const list = byStyle.get(item.style) ?? [];
    list.push(item);
    byStyle.set(item.style, list);
  }

  const order = profileStyleSlugs?.length
    ? [
        ...profileStyleSlugs.filter((s) => byStyle.has(s)),
        ...[...byStyle.keys()].filter((s) => !profileStyleSlugs.includes(s)),
      ]
    : [...byStyle.keys()].sort();

  return order
    .filter((style) => byStyle.has(style))
    .map((style) => ({
      style,
      label: styleLabel(style, catalog),
      images: byStyle.get(style)!,
    }));
}

export async function fetchPublicStudioPhotosByUserId(
  userId: string,
): Promise<PublicStudioPhoto[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_studio_photos")
    .select("id, image_url")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[ink] pro_studio_photos:", error.message);
    return [];
  }

  return data ?? [];
}

export async function fetchProPublicStylesForProfile(
  proProfileId: string,
): Promise<ProPublicStyles> {
  const admin = createAdminClient();
  return fetchProPublicStyles(admin, proProfileId);
}

export async function loadInkPageStyleData(proProfileId?: string | null) {
  const admin = createAdminClient();
  const catalog = await fetchTattooStyleCatalogAdmin(admin);
  const publicStyles = proProfileId
    ? await fetchProPublicStyles(admin, proProfileId)
    : { families: [], subStyles: [] };
  return { catalog, publicStyles };
}

export type { ProPublicStyles };
