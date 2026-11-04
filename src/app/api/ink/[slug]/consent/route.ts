import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Rate limit : 5 consentements / 10 min par IP (anti-abus)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`consent:${ip}`, { limit: 5, windowSecs: 600 });
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const body = await request.json() as {
      client_email?: string;
      signer_name?: string;
      signature?: string;
    };

    if (!body.client_email || !body.signer_name || !body.signature) {
      return NextResponse.json(
        { error: "client_email, signer_name et signature requis" },
        { status: 400 },
      );
    }

    // Validation basique de la signature (doit être un data URL PNG/JPEG en base64)
    if (!body.signature.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Format de signature invalide" },
        { status: 400 },
      );
    }

    // Limite de taille (max ~300 KB pour une signature canvas)
    if (body.signature.length > 400_000) {
      return NextResponse.json(
        { error: "Signature trop volumineuse" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("booking_consents")
      .insert({
        client_email: body.client_email.trim().toLowerCase(),
        signer_name: body.signer_name.trim(),
        signature: body.signature,
        pro_slug: slug,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[consent/sign] insert error", error);
      return NextResponse.json(
        { error: "Impossible de sauvegarder le consentement" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, consent_id: data.id });
  } catch (err) {
    console.error("[consent/sign] error", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
