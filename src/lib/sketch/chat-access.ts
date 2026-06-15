import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";

type Admin = SupabaseClient<Database>;

export type SketchChatContext = {
  booking: Booking;
  sketch: BookingSketch | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function clientOwnsBooking(user: User, booking: Booking): boolean {
  if (booking.client_id && booking.client_id === user.id) return true;
  const userEmail = normalizeEmail(user.email);
  const bookingEmail = normalizeEmail(booking.client_email);
  return Boolean(userEmail && bookingEmail && userEmail === bookingEmail);
}

export async function loadSketchChatForPro(
  admin: Admin,
  proUserId: string,
  bookingId: string,
): Promise<SketchChatContext | null> {
  const { data: booking, error } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("user_id", proUserId)
    .maybeSingle();

  if (error || !booking || booking.status === "cancelled") return null;

  const { data: sketch } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  return {
    booking: booking as Booking,
    sketch: (sketch as BookingSketch | null) ?? null,
  };
}

export async function loadSketchChatForClient(
  admin: Admin,
  user: User,
  bookingId: string,
): Promise<SketchChatContext | null> {
  const { data: booking, error } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking || booking.status === "cancelled") return null;
  if (!clientOwnsBooking(user, booking as Booking)) return null;

  const { data: sketch } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  return {
    booking: booking as Booking,
    sketch: (sketch as BookingSketch | null) ?? null,
  };
}

export async function resolveProEmail(
  admin: Admin,
  proUserId: string,
): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(proUserId);
  return data.user?.email ?? null;
}
