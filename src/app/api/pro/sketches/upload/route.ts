import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storagePublicUrl } from "@/lib/pro/storage-public-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData();
  const bookingId = form.get("booking_id");
  const file = form.get("file");

  if (typeof bookingId !== "string" || !bookingId) {
    return NextResponse.json({ error: "booking_id requis" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10 Mo)" },
      { status: 400 },
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (jpg, png, pdf)" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, user_id, client_email, client_name, status")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Seuls les RDV confirmés acceptent un croquis" },
      { status: 400 },
    );
  }

  if (!booking.client_email?.trim()) {
    return NextResponse.json(
      { error: "Ce RDV n'a pas d'email client" },
      { status: 400 },
    );
  }

  const { data: existing } = await admin
    .from("bookings_sketches")
    .select("id, storage_path")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing?.storage_path) {
    await admin.storage.from("croquis").remove([existing.storage_path]);
  }

  const ext = extForMime(file.type);
  const path = `${user.id}/${bookingId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("croquis")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[sketches/upload]", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const sketchUrl = storagePublicUrl("croquis", path);
  const now = new Date().toISOString();
  const validationToken = randomUUID();

  const updatePayload = {
    client_email: booking.client_email.trim(),
    sketch_url: sketchUrl,
    storage_path: path,
    status: "pending" as const,
    client_comment: null,
    validation_token: validationToken,
    updated_at: now,
  };

  if (existing) {
    const { data: updated, error: updateError } = await admin
      .from("bookings_sketches")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ sketch: updated });
  }

  const { data: inserted, error: insertError } = await admin
    .from("bookings_sketches")
    .insert({
      booking_id: bookingId,
      pro_user_id: user.id,
      ...updatePayload,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ sketch: inserted });
}
