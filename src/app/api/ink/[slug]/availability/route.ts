import { NextResponse } from "next/server";
import {
  checkPreferredDates,
  formatIsoDateLocal,
  getDurationMinutes,
  loadProAvailabilityContext,
  proposeAvailableSlots,
  slotsForDay,
} from "@/lib/pro/availability";
import { normalizeSizeCategory } from "@/lib/pro/ink-booking";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.user_id) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const url = new URL(request.url);
  const style = url.searchParams.get("style") ?? "";
  const sizeParam = url.searchParams.get("size") ?? "medium";
  const sizeCategory = normalizeSizeCategory(sizeParam);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const preferredParam = url.searchParams.get("preferred_dates");

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date();
  const to = toParam
    ? new Date(`${toParam}T23:59:59`)
    : new Date(from.getTime() + 28 * 24 * 60 * 60 * 1000);

  const ctx = await loadProAvailabilityContext(
    profile.user_id,
    from,
    to,
  );

  const duration_minutes = style
    ? getDurationMinutes(ctx, style, sizeCategory)
    : null;

  const preferred_dates = preferredParam
    ? preferredParam.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  const dateCheck = preferred_dates.length
    ? checkPreferredDates(preferred_dates, ctx)
    : null;

  const proposed =
    style && duration_minutes
      ? proposeAvailableSlots({
          ctx,
          style,
          sizeCategory,
          preferredDates: preferred_dates,
          count: 3,
          from,
        })
      : [];

  const days: { date: string; slots: string[] }[] = [];
  if (style && duration_minutes) {
    const cursor = new Date(from);
    while (cursor <= to) {
      const iso = formatIsoDateLocal(cursor);
      const slots = slotsForDay(cursor, ctx, duration_minutes);
      if (slots.length > 0) {
        days.push({ date: iso, slots });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return NextResponse.json({
    slug,
    style: style || null,
    size_category: sizeCategory,
    duration_minutes,
    blocked_dates: [...ctx.blockedDates].sort(),
    preferred_date_check: dateCheck,
    proposed_slots: proposed,
    days,
  });
}
