import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_DEPOSIT_SETTINGS,
  parseRulesFromDb,
  type DepositSettings,
} from "@/lib/pro/deposit-settings";
import { depositSettingsPutSchema } from "@/lib/pro/deposit-settings-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

function rowToSettings(row: {
  deposit_type: string;
  cancellation_policy: string;
  rules: unknown;
}): DepositSettings {
  return {
    deposit_type:
      row.deposit_type === "percent" ? "percent" : "fixed",
    cancellation_policy: row.cancellation_policy as DepositSettings["cancellation_policy"],
    rules: parseRulesFromDb(row.rules),
  };
}

export async function GET(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_deposit_settings")
    .select("deposit_type, cancellation_policy, rules")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ settings: DEFAULT_DEPOSIT_SETTINGS });
  }

  return NextResponse.json({ settings: rowToSettings(data) });
}

export async function PUT(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof depositSettingsPutSchema>;
  try {
    body = depositSettingsPutSchema.parse(await request.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_deposit_settings")
    .upsert(
      {
        user_id: user.id,
        deposit_type: body.deposit_type,
        cancellation_policy: body.cancellation_policy,
        rules: body.rules,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("deposit_type, cancellation_policy, rules")
    .single();

  if (error) {
    console.error("[api/pro/deposit-settings] PUT", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: rowToSettings(data) });
}
