import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

export async function DELETE(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id manquant" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: item, error: fetchErr } = await admin
    .from("pro_portfolio")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !item) {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }

  if (item.storage_path) {
    await admin.storage.from("portfolio").remove([item.storage_path]);
  }

  const { error: delErr } = await admin
    .from("pro_portfolio")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
