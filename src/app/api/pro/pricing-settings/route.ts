import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";
import type { ProPricingSettingsRow } from "@/lib/database.types";
import {
  type PricingSettings,
  DEFAULT_PRICING_SETTINGS,
} from "@/lib/pro/pricing-settings";

const pricingSettingsPutSchema = z.object({
  size_small_min: z.number().min(0),
  size_small_max: z.number().min(0),
  size_medium_min: z.number().min(0),
  size_medium_max: z.number().min(0),
  size_large_min: z.number().min(0),
  size_large_max: z.number().min(0),
  color_enabled: z.boolean(),
  color_type: z.enum(["pct", "fixed"]),
  color_amount: z.number().min(0),
  style_multipliers: z.record(z.string(), z.number().min(0.1).max(10)),
});

function rowToSettings(row: ProPricingSettingsRow): PricingSettings {
  return {
    size_small_min: row.size_small_min,
    size_small_max: row.size_small_max,
    size_medium_min: row.size_medium_min,
    size_medium_max: row.size_medium_max,
    size_large_min: row.size_large_min,
    size_large_max: row.size_large_max,
    color_enabled: row.color_enabled,
    color_type: row.color_type,
    color_amount: row.color_amount,
    style_multipliers: row.style_multipliers ?? {},
  };
}

export async function GET(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const psProfile = await resolveActiveProfile(admin, user.id);
  const { data, error } = await admin
    .from("pro_pricing_settings")
    .select("*")
    .eq("user_id", user.id)
    .eq("profile_id", psProfile?.id ?? "")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: data ? rowToSettings(data) : DEFAULT_PRICING_SETTINGS,
  });
}

export async function PUT(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof pricingSettingsPutSchema>;
  try {
    body = pricingSettingsPutSchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();
  const psActiveProfile = await resolveActiveProfile(admin, user.id);
  const psProfileId = psActiveProfile?.id ?? null;

  const { data: existingPs } = await admin
    .from("pro_pricing_settings")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("profile_id", psProfileId ?? "")
    .maybeSingle();

  const psPayload = { user_id: user.id, profile_id: psProfileId, ...body, updated_at: new Date().toISOString() };

  const { data, error } = existingPs
    ? await admin
        .from("pro_pricing_settings")
        .update(psPayload)
        .eq("user_id", user.id)
        .eq("profile_id", psProfileId ?? "")
        .select("*")
        .single()
    : await admin
        .from("pro_pricing_settings")
        .insert(psPayload)
        .select("*")
        .single();

  if (error) {
    console.error("[api/pro/pricing-settings] PUT", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: rowToSettings(data) });
}
