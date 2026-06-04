import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Garantit le rôle `pro` pour un utilisateur (service role).
 * Idempotent : succès si déjà présent ou doublon (trigger SQL inclus).
 */
export async function ensureProRole(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const { data: existing, error: readError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "pro")
    .maybeSingle();

  if (readError) {
    if (readError.code === "42P01") {
      return {
        ok: false,
        code: readError.code,
        message:
          "Table user_roles absente. Exécutez supabase/migrations/002_user_roles.sql dans le SQL Editor Supabase.",
      };
    }
    return { ok: false, code: readError.code, message: readError.message };
  }

  if (existing) return { ok: true };

  const { error: insertError } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "pro",
  });

  if (!insertError) return { ok: true };

  if (insertError.code === "23505") return { ok: true };

  return {
    ok: false,
    code: insertError.code,
    message: insertError.message,
  };
}
