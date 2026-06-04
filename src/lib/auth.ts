import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Rôle `pro` explicite dans user_roles. */
export async function getUserProRole(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "pro")
    .maybeSingle();
  return !!data;
}

/** Pro = rôle en base ou profil pro créé (onboarding terminé). */
export async function userHasProAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  if (await getUserProRole(supabase, userId)) return true;

  const { data: profile } = await supabase
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!profile;
}

export async function redirectPathForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"/pro/dashboard" | "/client/dashboard"> {
  const isPro = await userHasProAccess(supabase, userId);
  return isPro ? "/pro/dashboard" : "/client/dashboard";
}
