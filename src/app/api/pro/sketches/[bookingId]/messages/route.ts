import { NextResponse } from "next/server";
import {
  loadSketchChatForPro,
} from "@/lib/sketch/chat-access";
import {
  fetchSketchMessages,
  insertSketchMessage,
} from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

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
  const ctx = await loadSketchChatForPro(admin, user.id, bookingId);
  if (!ctx) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const messages = await fetchSketchMessages(admin, bookingId);
  return NextResponse.json({
    messages,
    sketch: ctx.sketch,
    booking: ctx.booking,
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
  let body: { message?: string } = {};
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const text = body.message?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ctx = await loadSketchChatForPro(admin, user.id, bookingId);
  if (!ctx) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const message = await insertSketchMessage(admin, {
    booking_id: bookingId,
    sender_role: "pro",
    message: text,
  });

  if (!message) {
    return NextResponse.json({ error: "Échec envoi message" }, { status: 500 });
  }

  return NextResponse.json({ message });
}
