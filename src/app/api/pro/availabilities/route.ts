import { NextResponse } from "next/server";
import { z } from "zod";
import { availabilitiesPutSchema } from "@/lib/pro/availabilities-schema";
import { averageDurationMinutes } from "@/lib/pro/style-duration-tiers";
import { normalizeTimeForDb } from "@/lib/pro/weekdays";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

export async function GET(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [schedulesRes, blockedRes, durationsRes, profileRes] = await Promise.all([
    admin
      .from("pro_schedules")
      .select("id, day_of_week, start_time, end_time")
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    admin
      .from("pro_blocked_dates")
      .select("id, blocked_date, reason")
      .eq("user_id", user.id)
      .order("blocked_date"),
    admin
      .from("pro_style_durations")
      .select(
        "style, size_category, duration_min_minutes, duration_max_minutes, duration_minutes",
      )
      .eq("user_id", user.id),
    admin.from("pro_profiles").select("styles").eq("user_id", user.id).maybeSingle(),
  ]);

  if (schedulesRes.error) {
    return NextResponse.json({ error: schedulesRes.error.message }, { status: 500 });
  }
  if (blockedRes.error) {
    return NextResponse.json({ error: blockedRes.error.message }, { status: 500 });
  }
  if (durationsRes.error) {
    return NextResponse.json({ error: durationsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    schedules: schedulesRes.data ?? [],
    blocked_dates: blockedRes.data ?? [],
    style_durations: durationsRes.data ?? [],
    profile_styles: profileRes.data?.styles ?? [],
  });
}

export async function PUT(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof availabilitiesPutSchema>;
  try {
    body = availabilitiesPutSchema.parse(await request.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  for (const day of body.schedules) {
    if (!day.active) continue;
    for (const slot of day.slots) {
      if (slot.end_time <= slot.start_time) {
        return NextResponse.json(
          { error: "L'heure de fin doit être après l'heure de début." },
          { status: 400 },
        );
      }
    }
  }

  const admin = createAdminClient();

  const { error: delSched } = await admin
    .from("pro_schedules")
    .delete()
    .eq("user_id", user.id);
  if (delSched) {
    return NextResponse.json({ error: delSched.message }, { status: 500 });
  }

  const scheduleRows = body.schedules.flatMap((day) =>
    day.active
      ? day.slots.map((slot) => ({
          user_id: user.id,
          day_of_week: day.day_of_week,
          start_time: normalizeTimeForDb(slot.start_time),
          end_time: normalizeTimeForDb(slot.end_time),
        }))
      : [],
  );

  if (scheduleRows.length > 0) {
    const { error: insSched } = await admin.from("pro_schedules").insert(scheduleRows);
    if (insSched) {
      return NextResponse.json({ error: insSched.message }, { status: 500 });
    }
  }

  const { error: delBlocked } = await admin
    .from("pro_blocked_dates")
    .delete()
    .eq("user_id", user.id);
  if (delBlocked) {
    return NextResponse.json({ error: delBlocked.message }, { status: 500 });
  }

  if (body.blocked_dates.length > 0) {
    const blockedRows = body.blocked_dates.map((d) => ({
      user_id: user.id,
      blocked_date: d,
    }));
    const { error: insBlocked } = await admin
      .from("pro_blocked_dates")
      .insert(blockedRows);
    if (insBlocked) {
      return NextResponse.json({ error: insBlocked.message }, { status: 500 });
    }
  }

  const { error: delDur } = await admin
    .from("pro_style_durations")
    .delete()
    .eq("user_id", user.id);
  if (delDur) {
    return NextResponse.json({ error: delDur.message }, { status: 500 });
  }

  if (body.style_durations.length > 0) {
    const durationRows = body.style_durations.map((d) => ({
      user_id: user.id,
      style: d.style,
      size_category: d.size_category,
      duration_min_minutes: d.duration_min_minutes,
      duration_max_minutes: d.duration_max_minutes,
      duration_minutes: averageDurationMinutes(
        d.duration_min_minutes,
        d.duration_max_minutes,
      ),
    }));
    const { error: insDur } = await admin
      .from("pro_style_durations")
      .insert(durationRows);
    if (insDur) {
      return NextResponse.json({ error: insDur.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
