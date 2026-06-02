import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

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

export async function redirectPathForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"/pro/dashboard" | "/client/dashboard"> {
  const isPro = await getUserProRole(supabase, userId);
  return isPro ? "/pro/dashboard" : "/client/dashboard";
}
