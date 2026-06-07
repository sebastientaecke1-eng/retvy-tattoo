import { createAdminClient } from "@/lib/supabase/admin";
import {
  averageDurationMinutes,
  DEFAULT_DURATION_TIERS,
  type SizeCategory,
  isSizeCategory,
} from "@/lib/pro/style-duration-tiers";

export type ProAvailabilityContext = {
  proUserId: string;
  schedules: { day_of_week: number; start_time: string; end_time: string }[];
  blockedDates: Set<string>;
  durationByStyleSize: Map<string, { min: number; max: number }>;
  bookings: { startMs: number; endMs: number }[];
};

export type AvailableSlot = {
  date: string;
  time: string;
  duration_minutes: number;
};

const SLOT_STEP_MINUTES = 30;

export function jsDateToDbDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function formatIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function durationKey(style: string, sizeCategory: SizeCategory): string {
  return `${style}:${sizeCategory}`;
}

export function getDurationMinutes(
  ctx: ProAvailabilityContext,
  style: string,
  sizeCategory: SizeCategory,
): number {
  const tier = ctx.durationByStyleSize.get(durationKey(style, sizeCategory));
  if (tier) return averageDurationMinutes(tier.min, tier.max);
  const defaults = DEFAULT_DURATION_TIERS[sizeCategory];
  return averageDurationMinutes(defaults.min, defaults.max);
}

function overlapsBooking(
  startMs: number,
  endMs: number,
  bookings: ProAvailabilityContext["bookings"],
): boolean {
  return bookings.some((b) => startMs < b.endMs && endMs > b.startMs);
}

export async function loadProAvailabilityContext(
  proUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<ProAvailabilityContext> {
  const admin = createAdminClient();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  const [schedulesRes, blockedRes, durationsRes, bookingsRes] =
    await Promise.all([
      admin
        .from("pro_schedules")
        .select("day_of_week, start_time, end_time")
        .eq("user_id", proUserId),
      admin
        .from("pro_blocked_dates")
        .select("blocked_date")
        .eq("user_id", proUserId),
      admin
        .from("pro_style_durations")
        .select(
          "style, size_category, duration_min_minutes, duration_max_minutes, duration_minutes",
        )
        .eq("user_id", proUserId),
      admin
        .from("bookings")
        .select("booking_date, duration_minutes, status")
        .eq("user_id", proUserId)
        .gte("booking_date", startIso)
        .lte("booking_date", endIso)
        .neq("status", "cancelled"),
    ]);

  const durationByStyleSize = new Map<string, { min: number; max: number }>();
  for (const row of durationsRes.data ?? []) {
    const cat = row.size_category;
    if (!cat || !isSizeCategory(cat)) continue;
    const min =
      row.duration_min_minutes ??
      row.duration_minutes ??
      DEFAULT_DURATION_TIERS[cat].min;
    const max =
      row.duration_max_minutes ??
      row.duration_minutes ??
      DEFAULT_DURATION_TIERS[cat].max;
    durationByStyleSize.set(durationKey(row.style, cat), { min, max });
  }

  const bookings = (bookingsRes.data ?? []).map((b) => {
    const start = new Date(b.booking_date).getTime();
    const end = start + b.duration_minutes * 60_000;
    return { startMs: start, endMs: end };
  });

  return {
    proUserId,
    schedules: schedulesRes.data ?? [],
    blockedDates: new Set((blockedRes.data ?? []).map((b) => b.blocked_date)),
    durationByStyleSize,
    bookings,
  };
}

export function slotsForDay(
  date: Date,
  ctx: ProAvailabilityContext,
  durationMinutes: number,
): string[] {
  const iso = formatIsoDateLocal(date);
  if (ctx.blockedDates.has(iso)) return [];

  const dbDay = jsDateToDbDay(date);
  const daySchedules = ctx.schedules.filter((s) => s.day_of_week === dbDay);
  const slots: string[] = [];

  for (const sched of daySchedules) {
    const windowStart = parseTimeToMinutes(sched.start_time);
    const windowEnd = parseTimeToMinutes(sched.end_time);

    for (
      let cursor = windowStart;
      cursor + durationMinutes <= windowEnd;
      cursor += SLOT_STEP_MINUTES
    ) {
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
      const startMs = slotDate.getTime();
      const endMs = startMs + durationMinutes * 60_000;
      if (!overlapsBooking(startMs, endMs, ctx.bookings)) {
        slots.push(minutesToTime(cursor));
      }
    }
  }

  return slots;
}

export function checkPreferredDates(
  dates: string[],
  ctx: ProAvailabilityContext,
): {
  blocked: string[];
  no_schedule: string[];
  available_days: string[];
} {
  const blocked: string[] = [];
  const noSchedule: string[] = [];
  const availableDays: string[] = [];

  for (const iso of dates) {
    if (ctx.blockedDates.has(iso)) {
      blocked.push(iso);
      continue;
    }
    const date = new Date(`${iso}T12:00:00`);
    const dbDay = jsDateToDbDay(date);
    const hasSchedule = ctx.schedules.some((s) => s.day_of_week === dbDay);
    if (!hasSchedule) {
      noSchedule.push(iso);
      continue;
    }
    availableDays.push(iso);
  }

  return {
    blocked,
    no_schedule: noSchedule,
    available_days: availableDays,
  };
}

export function proposeAvailableSlots(opts: {
  ctx: ProAvailabilityContext;
  style: string;
  sizeCategory: SizeCategory;
  preferredDates?: string[];
  count?: number;
  from?: Date;
  daysAhead?: number;
}): AvailableSlot[] {
  const count = opts.count ?? 3;
  const from = opts.from ?? new Date();
  const daysAhead = opts.daysAhead ?? 28;
  const duration = getDurationMinutes(opts.ctx, opts.style, opts.sizeCategory);

  const preferred = new Set(opts.preferredDates ?? []);
  const results: AvailableSlot[] = [];

  const tryDate = (date: Date) => {
    const iso = formatIsoDateLocal(date);
    const times = slotsForDay(date, opts.ctx, duration);
    for (const time of times) {
      results.push({ date: iso, time, duration_minutes: duration });
      if (results.length >= count) return true;
    }
    return false;
  };

  if (preferred.size > 0) {
    for (const iso of preferred) {
      const date = new Date(`${iso}T12:00:00`);
      if (date < from) continue;
      if (tryDate(date)) break;
    }
  }

  if (results.length < count) {
    for (let i = 0; i < daysAhead && results.length < count; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      const iso = formatIsoDateLocal(date);
      if (preferred.size > 0 && !preferred.has(iso)) continue;
      if (tryDate(date)) break;
    }
  }

  if (results.length < count && preferred.size > 0) {
    for (let i = 0; i < daysAhead && results.length < count; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      if (tryDate(date)) break;
    }
  }

  return results.slice(0, count);
}

export function isSlotStillAvailable(
  ctx: ProAvailabilityContext,
  date: string,
  time: string,
  style: string,
  sizeCategory: SizeCategory,
): boolean {
  const duration = getDurationMinutes(ctx, style, sizeCategory);
  const day = new Date(`${date}T12:00:00`);
  const slots = slotsForDay(day, ctx, duration);
  return slots.includes(time.slice(0, 5));
}
