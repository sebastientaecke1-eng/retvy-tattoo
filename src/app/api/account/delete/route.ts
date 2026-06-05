import { NextResponse } from "next/server";
import { deleteAccountForUser } from "@/lib/account/delete-account";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    await deleteAccountForUser(user.id);
    return NextResponse.json({ ok: true, redirect: "/" });
  } catch (err) {
    console.error("[api/account/delete]", err);
    const message =
      err instanceof Error ? err.message : "Échec de la suppression du compte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
