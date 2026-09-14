import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type PostAuthPath =
  | "/pro/dashboard"
  | "/pro/inscription"
  | "/client/dashboard";

export async function userHasProProfile(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_sub_profile", false)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Destination post-auth selon metadata + existence du profil pro. */
export function resolvePostAuthPath(
  metadata: Record<string, unknown> | null | undefined,
  hasProProfile: boolean,
): PostAuthPath {
  if (metadata?.role === "pro") {
    return hasProProfile ? "/pro/dashboard" : "/pro/inscription";
  }
  return "/client/dashboard";
}

export async function resolvePostAuthPathForUser(
  admin: SupabaseClient<Database>,
  user: Pick<User, "id" | "user_metadata">,
): Promise<PostAuthPath> {
  const hasProProfile = await userHasProProfile(admin, user.id);
  return resolvePostAuthPath(user.user_metadata, hasProProfile);
}

/** Chemins internes autorisés pour `?next=` après connexion. */
export function safeLoginRedirectPath(
  next: string | null | undefined,
): string | null {
  const trimmed = next?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  const pathname = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  const allowed = [
    "/pro/inscription",
    "/pro/dashboard",
    "/client/dashboard",
  ] as const;

  const ok = allowed.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  return ok ? trimmed : null;
}
