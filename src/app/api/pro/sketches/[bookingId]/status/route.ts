import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  sendSketchChatNotifyClient,
  sendSketchValidationEmail,
} from "@/lib/brevo-sketch";
import { formatBookingDate } from "@/lib/pro/bookings";
import type { SketchStatus } from "@/lib/pro/sketches";
import { loadSketchChatForPro } from "@/lib/sketch/chat-access";
import { insertSketchMessage } from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

const APP_URL = "https://retvy.fr";
const PRO_ALLOWED: SketchStatus[] = [
  "pending",
  "sent",
  "revision_requested",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { bookingId } = await params;
  let body: { status?: SketchStatus; notify?: boolean } = {};
  try {
    body = (await request.json()) as { status?: SketchStatus; notify?: boolean };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!body.status || !PRO_ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ctx = await loadSketchChatForPro(admin, user.id, bookingId);
  if (!ctx) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const { data: sketch, error: sketchError } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("pro_user_id", user.id)
    .maybeSingle();

  if (sketchError || !sketch) {
    return NextResponse.json({ error: "Croquis introuvable" }, { status: 404 });
  }

  if (body.status === "sent" && !sketch.sketch_url) {
    return NextResponse.json(
      { error: "Uploadez d'abord un croquis" },
      { status: 400 },
    );
  }

  const validationToken = randomUUID();
  const now = new Date().toISOString();
  const chatUrl = `${APP_URL}/client/dashboard/croquis/${bookingId}`;

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const clientEmail = ctx.booking.client_email?.trim() ?? sketch.client_email;
  const artistName = profile?.artist_name ?? "Votre tatoueur";
  const bookingDate = formatBookingDate(ctx.booking.booking_date);

  if (body.status === "sent" && body.notify !== false && clientEmail) {
    if (sketch.sketch_url) {
      const emailResult = await sendSketchValidationEmail({
        clientEmail,
        clientName: ctx.booking.client_name,
        artistName,
        bookingDate,
        sketchUrl: sketch.sketch_url,
        validationToken,
        chatUrl,
      });
      if (!emailResult.ok) {
        console.error("[sketch/status] email client", emailResult.error);
      }
    } else {
      const emailResult = await sendSketchChatNotifyClient({
        clientEmail,
        clientName: ctx.booking.client_name,
        artistName,
        bookingDate,
        chatUrl,
      });
      if (!emailResult.ok) {
        console.error("[sketch/status] notify client", emailResult.error);
      }
    }
  }

  const { data: updated, error: updateError } = await admin
    .from("bookings_sketches")
    .update({
      status: body.status,
      client_email: clientEmail,
      validation_token: validationToken,
      ...(body.status === "sent" ? { client_comment: null } : {}),
      updated_at: now,
    })
    .eq("id", sketch.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (body.status === "sent") {
    await insertSketchMessage(admin, {
      booking_id: bookingId,
      sender_role: "pro",
      message: "Croquis envoyé au client.",
    });
  }

  return NextResponse.json({ sketch: updated });
}
