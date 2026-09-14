import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyBlockAvailabilities } from "@/lib/pro/block-availabilities";
import { blockApplySchema } from "@/lib/pro/block-availabilities-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";
import { createClient } from "@/lib/supabase/server";

async function resolveAccessToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function scheduleApplyBlockSideEffects(
  accessToken: string,
  payload: {
    booking_ids: string[];
    date_from: string;
    date_to: string;
    reason?: string;
  },
) {
  if (payload.booking_ids.length === 0) return;

  const supabaseUrl = getSupabaseUrl().replace(/\/$/, "");
  const functionUrl = `${supabaseUrl}/functions/v1/apply-block-side-effects`;

  const task = fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: getSupabaseAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[pro/availabilities/block-apply edge]", res.status, text);
      } else {
        console.log(
          "[pro/availabilities/block-apply edge] ok",
          await res.json().catch(() => ({})),
        );
      }
    })
    .catch((err) => {
      console.error("[pro/availabilities/block-apply edge]", err);
    });

  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(task);
  } catch {
    void task;
  }
}

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  let body: z.infer<typeof blockApplySchema>;
  try {
    body = blockApplySchema.parse(await request.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues[0]?.message
        : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profil pro introuvable" }, { status: 404 });
  }

  try {
    console.log("[pro/availabilities/block-apply] start", {
      userId: user.id,
      date_from: body.date_from,
      date_to: body.date_to,
    });

    const { result, bookingIds } = await applyBlockAvailabilities(
      admin,
      user.id,
      body.date_from,
      body.date_to,
      body.reason,
    );

    scheduleApplyBlockSideEffects(accessToken, {
      booking_ids: bookingIds,
      date_from: body.date_from,
      date_to: body.date_to,
      reason: body.reason,
    });

    console.log("[pro/availabilities/block-apply] done", result);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[pro/availabilities/block-apply]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
