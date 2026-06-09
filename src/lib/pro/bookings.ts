import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatInParis,
  parisDateTimeParts,
  parisDayKey,
} from "@/lib/datetime/paris";
import type { CancellationPolicy } from "@/lib/pro/deposit-settings";
import { CANCELLATION_OPTIONS } from "@/lib/pro/deposit-settings";
import type { Database } from "@/lib/database.types";
import { styleLabel } from "@/lib/pro/public-profile";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  project_description: string | null;
  style: string | null;
  zone: string | null;
  size: string | null;
  reference_image_url: string | null;
  booking_date: string;
  duration_minutes: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: BookingStatus;
  cancellation_policy: CancellationPolicy;
  created_at: string;
};

export type AgendaView = "week" | "month";
export type ListFilter = "today" | "week" | "month" | "all";

const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: "Confirmé",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  pending: {
    label: "En attente",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  cancelled: {
    label: "Annulé",
    className: "border-red-500/40 bg-red-500/10 text-red-400",
  },
};

export function splitClientName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function getBookingStatusMeta(status: BookingStatus) {
  return STATUS_META[status];
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatBookingTime(iso: string): string {
  return formatInParis(iso, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Heure compacte pour l'agenda (ex. 14h00) — toujours en Europe/Paris. */
export function formatBookingTimeCompact(iso: string): string {
  const { hour, minute } = parisDateTimeParts(iso);
  return `${hour.padStart(2, "0")}h${minute.padStart(2, "0")}`;
}

/** Plage horaire : 14h00 → 17h30 (3h30). */
export function formatBookingTimeRange(
  iso: string,
  durationMinutes: number,
): string {
  const startMs = new Date(iso).getTime();
  const endIso = new Date(
    startMs + durationMinutes * 60_000,
  ).toISOString();
  return `${formatBookingTimeCompact(iso)} → ${formatBookingTimeCompact(endIso)} (${formatDuration(durationMinutes)})`;
}

export function formatStyleZone(booking: Booking): string {
  const parts = [
    booking.style ? styleLabel(booking.style) : null,
    booking.zone?.trim() || null,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function formatBookingDate(iso: string): string {
  return formatInParis(iso, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatProjectSummary(booking: Booking): string {
  const parts = [
    booking.style ? styleLabel(booking.style) : null,
    booking.zone?.trim() || null,
    booking.size?.trim() || null,
  ].filter(Boolean);
  return parts.join(" · ") || "Projet non renseigné";
}

export function cancellationPolicyLabel(policy: CancellationPolicy): string {
  return (
    CANCELLATION_OPTIONS.find((o) => o.id === policy)?.label ?? policy
  );
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Semaine calendaire (lundi → dimanche). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return endOfDay(d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Compare un RDV (UTC en base) à une date calendrier locale du navigateur. */
export function isBookingOnCalendarDay(bookingIso: string, day: Date): boolean {
  const bookingKey = parisDayKey(bookingIso);
  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  return bookingKey === dayKey;
}

export function bookingDate(booking: Booking): Date {
  return new Date(booking.booking_date);
}

export function bookingsInRange(
  bookings: Booking[],
  rangeStart: Date,
  rangeEnd: Date,
): Booking[] {
  const start = rangeStart.getTime();
  const end = rangeEnd.getTime();
  return bookings
    .filter((b) => {
      const t = bookingDate(b).getTime();
      return t >= start && t <= end;
    })
    .sort(
      (a, b) =>
        bookingDate(a).getTime() - bookingDate(b).getTime(),
    );
}

export function filterBookingsByListPeriod(
  bookings: Booking[],
  filter: ListFilter,
  anchor = new Date(),
): Booking[] {
  const now = anchor;
  if (filter === "all") {
    return [...bookings].sort(
      (a, b) =>
        bookingDate(a).getTime() - bookingDate(b).getTime(),
    );
  }
  if (filter === "today") {
    return bookingsInRange(bookings, startOfDay(now), endOfDay(now));
  }
  if (filter === "week") {
    return bookingsInRange(bookings, startOfWeek(now), endOfWeek(now));
  }
  return bookingsInRange(bookings, startOfMonth(now), endOfMonth(now));
}

export function formatWeekRangeLabel(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const yearFmt = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)} ${yearFmt.format(end)}`;
}

export function formatMonthLabel(anchor: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(anchor);
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getMonthGridDays(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export function shiftWeek(anchor: Date, delta: number): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

export function shiftMonth(anchor: Date, delta: number): Date {
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/** RDV actifs du pro : pending (acompte en attente) + confirmed. */
export async function fetchProBookings(
  admin: SupabaseClient<Database>,
  proUserId: string,
): Promise<Booking[]> {
  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("user_id", proUserId)
    .in("status", ["pending", "confirmed"])
    .order("booking_date", { ascending: true });

  if (error) {
    console.error("[fetchProBookings]", error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}

export function splitBookingDateTime(iso: string): {
  slot_date: string;
  slot_time: string;
} {
  const parts = parisDateTimeParts(iso);
  return {
    slot_date: `${parts.year}-${parts.month}-${parts.day}`,
    slot_time: `${parts.hour.padStart(2, "0")}:${parts.minute.padStart(2, "0")}`,
  };
}
