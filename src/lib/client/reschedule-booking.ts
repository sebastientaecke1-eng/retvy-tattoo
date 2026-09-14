import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatIsoDateLocal,
  getDurationMinutes,
  isSlotStillAvailable,
  loadProAvailabilityContext,
  slotsForDay,
  type AvailableSlot,
} from "@/lib/pro/availability";
import type { Database } from "@/lib/database.types";
import type { Booking } from "@/lib/pro/bookings";
import { splitBookingDateTime } from "@/lib/pro/bookings";
import { computeProDepositEur } from "@/lib/pro/compute-deposit";
import {
  combineBookingDateTime,
  parseSizeCategory,
} from "@/lib/pro/ink-booking";
import type { SizeCategory } from "@/lib/pro/style-duration-tiers";

export function canClientRescheduleBooking(booking: {
  status: string;
  cancellation_reason?: string | null;
  client_action?: string | null;
}): boolean {
  return (
    String(booking.status).toLowerCase() === "cancelled" &&
    booking.cancellation_reason === "pro_unavailability" &&
    booking.client_action === "pending"
  );
}

export function canClientDismissReschedule(booking: {
  status: string;
  cancellation_reason?: string | null;
  client_action?: string | null;
}): boolean {
  return canClientRescheduleBooking(booking);
}

export function isProUnavailabilityCancelled(booking: {
  status: string;
  cancellation_reason?: string | null;
}): boolean {
  return (
    String(booking.status).toLowerCase() === "cancelled" &&
    booking.cancellation_reason === "pro_unavailability"
  );
}

function sizeCategoryFromBooking(booking: Booking): SizeCategory {
  return parseSizeCategory(booking.size ?? "medium");
}

export type RescheduleOptionsResult = {
  booking_id: string;
  artist_slug: string;
  artist_name: string;
  style: string;
  size_category: SizeCategory;
  duration_minutes: number;
  deposit_amount: number;
  days: { date: string; slots: string[] }[];
  blocked_dates: string[];
};

export async function getRescheduleOptions(
  admin: SupabaseClient<Database>,
  booking: Booking,
  artistSlug: string,
  artistName: string,
): Promise<RescheduleOptionsResult> {
  const sizeCategory = sizeCategoryFromBooking(booking);
  const style = booking.style ?? "autre";

  const from = new Date();
  const to = new Date(from.getTime() + 60 * 24 * 60 * 60 * 1000);

  const ctx = await loadProAvailabilityContext(booking.user_id, from, to);
  const duration_minutes =
    booking.duration_minutes ||
    getDurationMinutes(ctx, style, sizeCategory);

  const days: { date: string; slots: string[] }[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const iso = formatIsoDateLocal(cursor);
    const slots = slotsForDay(cursor, ctx, duration_minutes);
    if (slots.length > 0) {
      days.push({ date: iso, slots });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const deposit_amount = await computeProDepositEur(
    admin,
    booking.user_id,
    booking.deposit_amount,
  );

  return {
    booking_id: booking.id,
    artist_slug: artistSlug,
    artist_name: artistName,
    style,
    size_category: sizeCategory,
    duration_minutes,
    deposit_amount,
    days,
    blocked_dates: [...ctx.blockedDates].sort(),
  };
}

export type ReschedulePaymentPayload = {
  bookingId: string;
  proSlug: string;
  depositAmount: number;
  reference: string;
  bookingData: Record<string, unknown>;
};

export function buildReschedulePaymentPayload(
  booking: Booking,
  artistSlug: string,
  clientUserId: string,
  clientEmail: string,
  reference?: string,
): ReschedulePaymentPayload {
  const { slot_date, slot_time } = splitBookingDateTime(booking.booking_date);
  const sizeCategory = sizeCategoryFromBooking(booking);

  return {
    bookingId: booking.id,
    proSlug: artistSlug,
    depositAmount: booking.deposit_amount,
    reference: reference ?? `RTVY-${randomUUID().slice(0, 8).toUpperCase()}`,
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
      client_email: booking.client_email ?? clientEmail,
      client_phone: booking.client_phone ?? "",
      project_description:
        booking.project_description ?? "Reprise de rendez-vous Retvy",
      reference_image_url: booking.reference_image_url,
      color_preference: booking.color_preference,
      client_id: clientUserId,
    },
  };
}

export async function rescheduleClientBooking(
  admin: SupabaseClient<Database>,
  original: Booking,
  artistSlug: string,
  slotDate: string,
  slotTime: string,
  clientUserId: string,
  clientEmail: string,
): Promise<
  | { ok: true; payment: ReschedulePaymentPayload; newBookingId: string }
  | { ok: false; status: number; error: string }
> {
  if (!canClientRescheduleBooking(original)) {
    return {
      ok: false,
      status: 400,
      error: "Cette réservation n'est pas éligible à une reprise.",
    };
  }

  if (original.rescheduled_to_booking_id) {
    const { data: linked } = await admin
      .from("bookings")
      .select("*")
      .eq("id", original.rescheduled_to_booking_id)
      .maybeSingle();

    if (
      linked &&
      linked.status === "pending" &&
      !linked.deposit_paid
    ) {
      return {
        ok: true,
        newBookingId: linked.id,
        payment: buildReschedulePaymentPayload(
          linked as Booking,
          artistSlug,
          clientUserId,
          clientEmail,
        ),
      };
    }

    return {
      ok: false,
      status: 409,
      error: "Une reprise de rendez-vous est déjà en cours pour cette réservation.",
    };
  }

  const sizeCategory = sizeCategoryFromBooking(original);
  const style = original.style ?? "autre";

  const from = new Date();
  const to = new Date(from.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ctx = await loadProAvailabilityContext(original.user_id, from, to);

  if (
    !isSlotStillAvailable(ctx, slotDate, slotTime, style, sizeCategory)
  ) {
    return {
      ok: false,
      status: 409,
      error: "Ce créneau n'est plus disponible. Choisissez-en un autre.",
    };
  }

  const duration_minutes =
    original.duration_minutes ||
    getDurationMinutes(ctx, style, sizeCategory);
  const deposit_amount = await computeProDepositEur(
    admin,
    original.user_id,
    original.deposit_amount,
  );
  const booking_date = combineBookingDateTime(slotDate, slotTime);
  const reference = `RTVY-${randomUUID().slice(0, 8).toUpperCase()}`;

  const { data: newBooking, error: insertErr } = await admin
    .from("bookings")
    .insert({
      user_id: original.user_id,
      client_id: original.client_id ?? clientUserId,
      client_name: original.client_name,
      client_email: original.client_email ?? clientEmail,
      client_phone: original.client_phone,
      project_description: original.project_description,
      style: original.style,
      zone: original.zone,
      size: original.size,
      reference_image_url: original.reference_image_url,
      color_preference: original.color_preference,
      booking_date,
      slot_date: slotDate,
      slot_time: slotTime,
      duration_minutes,
      deposit_amount,
      deposit_paid: false,
      status: "pending",
      cancellation_policy: original.cancellation_policy,
      rescheduled_from_booking_id: original.id,
      refund_status: "not_applicable",
    })
    .select("*")
    .single();

  if (insertErr || !newBooking) {
    return {
      ok: false,
      status: 500,
      error: insertErr?.message ?? "Impossible de créer la nouvelle réservation",
    };
  }

  const { error: linkErr } = await admin
    .from("bookings")
    .update({
      rescheduled_to_booking_id: newBooking.id,
      client_action: "reschedule",
    })
    .eq("id", original.id);

  if (linkErr) {
    await admin.from("bookings").delete().eq("id", newBooking.id);
    return {
      ok: false,
      status: 500,
      error: linkErr.message,
    };
  }

  return {
    ok: true,
    newBookingId: newBooking.id,
    payment: buildReschedulePaymentPayload(
      newBooking as Booking,
      artistSlug,
      clientUserId,
      clientEmail,
      reference,
    ),
  };
}

export async function dismissReschedule(
  admin: SupabaseClient<Database>,
  booking: Booking,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!canClientDismissReschedule(booking)) {
    return {
      ok: false,
      status: 400,
      error: "Cette réservation ne peut pas être classée ainsi.",
    };
  }

  const { error } = await admin
    .from("bookings")
    .update({ client_action: "declined" })
    .eq("id", booking.id);

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true };
}

export function availableSlotsFromDays(
  days: { date: string; slots: string[] }[],
  duration_minutes: number,
): AvailableSlot[] {
  return days.flatMap((day) =>
    day.slots.map((time) => ({
      date: day.date,
      time,
      duration_minutes,
    })),
  );
}
