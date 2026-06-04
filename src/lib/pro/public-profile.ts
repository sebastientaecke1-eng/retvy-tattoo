import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PublicProProfile =
  Database["public"]["Views"]["pro_profiles_public"]["Row"];

const PUBLIC_PROFILE_COLUMNS =
  "user_id, slug, artist_name, studio, styles, avatar_url, cover_url, bio, city, price_min, price_max, status" as const;

/** Profil public pour /ink/[slug] — vue anon, repli service role si RLS/vue pas à jour. */
export async function fetchPublicProProfileBySlug(
  slug: string,
): Promise<PublicProProfile | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data: viaView, error: viewError } = await supabase
    .from("pro_profiles_public")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (viaView?.artist_name) return viaView;

  if (viewError) {
    console.warn("[ink] pro_profiles_public:", viewError.message);
  }

  const admin = createAdminClient();
  const { data: row, error: adminError } = await admin
    .from("pro_profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("slug", normalized)
    .maybeSingle();

  if (adminError) {
    console.warn("[ink] pro_profiles admin:", adminError.message);
    return null;
  }

  if (!row?.artist_name) return null;
  return row as PublicProProfile;
}
