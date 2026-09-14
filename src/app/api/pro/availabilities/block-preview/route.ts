import { NextResponse } from "next/server";
import { z } from "zod";
import { previewBlockAvailabilities } from "@/lib/pro/block-availabilities";
import { blockAvailabilitiesSchema } from "@/lib/pro/block-availabilities-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof blockAvailabilitiesSchema>;
  try {
    body = blockAvailabilitiesSchema.parse(await request.json());
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
    const preview = await previewBlockAvailabilities(
      admin,
      user.id,
      body.date_from,
      body.date_to,
    );

    return NextResponse.json({
      ...preview,
      reason: body.reason ?? null,
    });
  } catch (err) {
    console.error("[pro/availabilities/block-preview]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
