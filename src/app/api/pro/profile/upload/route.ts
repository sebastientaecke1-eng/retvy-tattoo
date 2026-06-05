import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProStyleId } from "@/lib/pro/styles";
import { MAX_STUDIO_PHOTOS } from "@/lib/pro/studio";
import { storagePublicUrl } from "@/lib/pro/storage-public-url";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData();
  const kind = form.get("kind");
  const file = form.get("file");

  if (kind !== "avatar" && kind !== "portfolio" && kind !== "studio") {
    return NextResponse.json({ error: "Type upload invalide" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = extForMime(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "avatar") {
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) {
      console.error("[upload] avatar", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const imageUrl = storagePublicUrl("avatars", path);
    const { data: updated, error: dbErr } = await admin
      .from("pro_profiles")
      .update({
        avatar_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("avatar_url")
      .single();

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url: updated?.avatar_url ?? imageUrl,
      kind: "avatar",
    });
  }

  if (kind === "studio") {
    const { count } = await admin
      .from("pro_studio_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= MAX_STUDIO_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_STUDIO_PHOTOS} photos du studio.` },
        { status: 400 },
      );
    }

    const fileId = crypto.randomUUID();
    const path = `${user.id}/${fileId}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("studio-photos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) {
      console.error("[upload] studio-photos", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const imageUrl = storagePublicUrl("studio-photos", path);
    const { data: row, error: insErr } = await admin
      .from("pro_studio_photos")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        storage_path: path,
        position: count ?? 0,
      })
      .select("id, image_url, position")
      .single();

    if (insErr) {
      console.error("[upload] pro_studio_photos", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: row, kind: "studio" });
  }

  const style = String(form.get("style") ?? "").toLowerCase();
  if (!isProStyleId(style)) {
    return NextResponse.json({ error: "Style invalide" }, { status: 400 });
  }

  const fileId = crypto.randomUUID();
  const path = `${user.id}/${style}/${fileId}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("portfolio")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    console.error("[upload] portfolio", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const imageUrl = storagePublicUrl("portfolio", path);
  const { count } = await admin
    .from("pro_portfolio")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("style", style);

  const { data: row, error: insErr } = await admin
    .from("pro_portfolio")
    .insert({
      user_id: user.id,
      style,
      image_url: imageUrl,
      storage_path: path,
      position: count ?? 0,
    })
    .select("id, style, image_url, position, created_at")
    .single();

  if (insErr) {
    console.error("[upload] pro_portfolio", insErr);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: row, kind: "portfolio" });
}
