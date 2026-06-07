import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendSketchValidationEmail } from "@/lib/brevo-sketch";
import { formatBookingDate } from "@/lib/pro/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let bookingId: string | undefined;
  try {
    const body = (await request.json()) as { booking_id?: string };
    bookingId = body.booking_id;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: "booking_id requis" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: sketch, error: sketchError } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("pro_user_id", user.id)
    .maybeSingle();

  if (sketchError || !sketch) {
    return NextResponse.json({ error: "Croquis introuvable" }, { status: 404 });
  }

  if (!sketch.sketch_url) {
    return NextResponse.json(
      { error: "Uploadez d'abord un croquis" },
      { status: 400 },
    );
  }

  if (sketch.status === "approved") {
    return NextResponse.json(
      { error: "Ce croquis est déjà validé par le client" },
      { status: 400 },
    );
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("client_name, client_email, booking_date, status")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!booking || booking.status !== "confirmed") {
    return NextResponse.json({ error: "Réservation invalide" }, { status: 400 });
  }

  const clientEmail = booking.client_email?.trim() ?? sketch.client_email;
  if (!clientEmail) {
    return NextResponse.json(
      { error: "Email client manquant pour ce RDV" },
      { status: 400 },
    );
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const validationToken = randomUUID();
  const now = new Date().toISOString();

  const emailResult = await sendSketchValidationEmail({
    clientEmail,
    clientName: booking.client_name,
    artistName: profile?.artist_name ?? "Votre tatoueur",
    bookingDate: formatBookingDate(booking.booking_date),
    sketchUrl: sketch.sketch_url,
    validationToken,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      { error: "Échec de l'envoi de l'email" },
      { status: 502 },
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("bookings_sketches")
    .update({
      status: "sent",
      client_email: clientEmail,
      validation_token: validationToken,
      client_comment: null,
      updated_at: now,
    })
    .eq("id", sketch.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ sketch: updated });
}
