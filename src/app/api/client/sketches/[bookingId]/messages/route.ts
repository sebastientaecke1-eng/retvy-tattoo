import { NextResponse } from "next/server";
import { sendSketchChatNotifyPro } from "@/lib/brevo-sketch";
import { formatBookingDate } from "@/lib/pro/bookings";
import {
  loadSketchChatForClient,
  resolveProEmail,
} from "@/lib/sketch/chat-access";
import {
  fetchSketchMessages,
  insertSketchMessage,
} from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

const APP_URL = "https://retvy.fr";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const user = await resolveRequestUser(_request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { bookingId } = await params;
  const admin = createAdminClient();
  const ctx = await loadSketchChatForClient(admin, user, bookingId);
  if (!ctx) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const messages = await fetchSketchMessages(admin, bookingId);

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name, slug")
    .eq("user_id", ctx.booking.user_id)
    .maybeSingle();

  return NextResponse.json({
    messages,
    sketch: ctx.sketch,
    booking: ctx.booking,
    artist_name: profile?.artist_name ?? "Tatoueur",
    artist_slug: profile?.slug ?? "",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { bookingId } = await params;
  let body: {
    message?: string;
    action?: "approve" | "revision";
  } = {};
  try {
    body = (await request.json()) as {
      message?: string;
      action?: "approve" | "revision";
    };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ctx = await loadSketchChatForClient(admin, user, bookingId);
  if (!ctx) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name")
    .eq("user_id", ctx.booking.user_id)
    .maybeSingle();

  const artistName = profile?.artist_name ?? "Tatoueur";
  const bookingDate = formatBookingDate(ctx.booking.booking_date);
  const chatUrl = `${APP_URL}/pro/dashboard/croquis/${bookingId}`;
  const proEmail = await resolveProEmail(admin, ctx.booking.user_id);

  if (body.action === "approve") {
    const { data: sketch } = await admin
      .from("bookings_sketches")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (sketch) {
      await admin
        .from("bookings_sketches")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", sketch.id);
    }

    const message = await insertSketchMessage(admin, {
      booking_id: bookingId,
      sender_role: "client",
      message: "✅ Croquis validé par le client.",
    });

    if (proEmail) {
      void sendSketchChatNotifyPro({
        proEmail,
        clientName: ctx.booking.client_name,
        artistName,
        bookingDate,
        chatUrl,
        kind: "approved",
      });
    }

    return NextResponse.json({ message, sketch_status: "approved" });
  }

  if (body.action === "revision") {
    const text = body.message?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Décrivez la modification souhaitée" },
        { status: 400 },
      );
    }

    const { data: sketch } = await admin
      .from("bookings_sketches")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (sketch) {
      await admin
        .from("bookings_sketches")
        .update({
          status: "revision_requested",
          client_comment: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sketch.id);
    }

    const message = await insertSketchMessage(admin, {
      booking_id: bookingId,
      sender_role: "client",
      message: `Modification demandée : ${text}`,
    });

    if (proEmail) {
      void sendSketchChatNotifyPro({
        proEmail,
        clientName: ctx.booking.client_name,
        artistName,
        bookingDate,
        chatUrl,
        kind: "revision",
        preview: text,
      });
    }

    return NextResponse.json({ message, sketch_status: "revision_requested" });
  }

  const text = body.message?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const message = await insertSketchMessage(admin, {
    booking_id: bookingId,
    sender_role: "client",
    message: text,
  });

  if (!message) {
    return NextResponse.json({ error: "Échec envoi message" }, { status: 500 });
  }

  if (proEmail) {
    void sendSketchChatNotifyPro({
      proEmail,
      clientName: ctx.booking.client_name,
      artistName,
      bookingDate,
      chatUrl,
      kind: "message",
      preview: text,
    });
  }

  return NextResponse.json({ message });
}
