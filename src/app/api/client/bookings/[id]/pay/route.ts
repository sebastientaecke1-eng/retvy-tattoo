import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { fetchClientBookings } from "@/lib/client/bookings";
import { parseSizeCategory } from "@/lib/pro/ink-booking";
import { splitBookingDateTime } from "@/lib/pro/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const bookings = await fetchClientBookings(admin, user.email, user.id);
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  if (booking.deposit_paid) {
    return NextResponse.json({ error: "Acompte déjà payé" }, { status: 400 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Réservation annulée" }, { status: 400 });
  }

  const { slot_date, slot_time } = splitBookingDateTime(booking.booking_date);
  const sizeCategory = parseSizeCategory(booking.size ?? "moyen");
  const reference = `RTVY-${randomUUID().slice(0, 8).toUpperCase()}`;

  return NextResponse.json({
    bookingId: booking.id,
    proSlug: booking.artist_slug,
    depositAmount: booking.deposit_amount,
    reference,
    bookingData: {
      style: booking.style ?? "autre",
      zone: booking.zone ?? "—",
      size: booking.size ?? sizeCategory,
      size_category: sizeCategory,
      budget: booking.deposit_amount,
      slot_date,
      slot_time,
      duration_minutes: booking.duration_minutes,
      client_name: booking.client_name,
      client_email: booking.client_email ?? user.email,
      client_phone: booking.client_phone ?? "",
      project_description:
        booking.project_description ?? "Réservation Retvy",
      reference_image_url: booking.reference_image_url,
      client_id: user.id,
    },
  });
}
