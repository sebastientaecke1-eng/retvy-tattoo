import { NextResponse } from "next/server";
import { sendBookingCancellationPro } from "@/lib/brevo-booking";
import {
  canClientCancelBooking,
  fetchClientBookings,
} from "@/lib/client/bookings";
import {
  formatBookingDate,
  formatBookingTime,
  formatProjectSummary,
} from "@/lib/pro/bookings";
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
    return NextResponse.json(
      { error: "Réservation introuvable" },
      { status: 404 },
    );
  }

  if (!canClientCancelBooking(booking)) {
    const reason =
      String(booking.status).toLowerCase() === "cancelled"
        ? "Ce rendez-vous est déjà annulé"
        : "Impossible d'annuler un rendez-vous passé";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (updateError) {
    console.error("[client/bookings/cancel]", updateError.message);
    return NextResponse.json(
      { error: "Impossible d'annuler la réservation" },
      { status: 500 },
    );
  }

  if (process.env.BREVO_API_KEY) {
    const { data: proUser } = await admin.auth.admin.getUserById(
      booking.user_id,
    );
    const proEmail = proUser.user?.email;

    if (proEmail) {
      const dateLabel = formatBookingDate(booking.booking_date);
      const timeLabel = formatBookingTime(booking.booking_date);
      await sendBookingCancellationPro({
        proEmail,
        clientName: booking.client_name,
        clientEmail: booking.client_email ?? user.email,
        artistName: booking.artist_name,
        date: dateLabel,
        time: timeLabel,
        projectSummary: formatProjectSummary(booking),
      }).catch((err) =>
        console.error("[client/bookings/cancel] email pro", err),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
