import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProRole } from "@/lib/supabase/ensure-pro-role";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

/** Garantit user_roles.pro (idempotent). */
export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Profil pro introuvable. Terminez l'inscription." },
      { status: 400 },
    );
  }

  const roleResult = await ensureProRole(admin, user.id);
  if (!roleResult.ok) {
    return NextResponse.json(
      { error: roleResult.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
