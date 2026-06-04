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

/** Chemin dashboard — utiliser avec service role (RLS pro_profiles côté client). */
export async function getDashboardPathForUser(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<"/pro/dashboard" | "/client/dashboard"> {
  const isPro = await userHasProAccess(admin, userId);
  return isPro ? "/pro/dashboard" : "/client/dashboard";
}

/** @deprecated Préférer getDashboardPathForUser(admin) ou fetchDashboardPath() */
export async function redirectPathForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"/pro/dashboard" | "/client/dashboard"> {
  return getDashboardPathForUser(supabase, userId);
}

export async function fetchDashboardPath(): Promise<
  "/pro/dashboard" | "/client/dashboard" | null
> {
  const res = await fetch("/api/me/dashboard-path", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { path?: string };
  if (data.path === "/pro/dashboard" || data.path === "/client/dashboard") {
    return data.path;
  }
  return null;
}
