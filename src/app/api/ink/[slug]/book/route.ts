import { NextResponse } from "next/server";
import { prepareInkBooking } from "@/lib/pro/prepare-ink-booking";
import { combineBookingDateTime } from "@/lib/pro/ink-booking";

/** Valide le créneau et prépare les données (sans appel Stripe). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rawBody = await request.json();
  const result = await prepareInkBooking(slug, rawBody);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  const { data } = result;

  return NextResponse.json({
    deposit: data.depositEur,
    reference: data.reference,
    booking_preview: {
      booking_date: combineBookingDateTime(
        data.body.slot_date,
        data.body.slot_time,
      ),
      duration_minutes: data.body.duration_minutes,
    },
  });
}
