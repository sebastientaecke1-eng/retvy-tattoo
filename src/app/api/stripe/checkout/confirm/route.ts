import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

function appOrigin(): string {
  return "https://retvy.fr";
}

function supabaseFunctionUrl(name: string): string {
  return `${getSupabaseUrl().replace(/\/$/, "")}/functions/v1/${name}`;
}

/** Extrait le Bearer token de l'en-tête Authorization. */
function extractBearer(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

/**
 * Retour Stripe Checkout : redirection immédiate vers le wizard avec session_id.
 * Le wizard appellera POST /confirm pour créer l'abonnement via la fonction Supabase.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const origin = appOrigin();

  if (!sessionId) {
    return NextResponse.redirect(`${origin}/pro/inscription?step=4&sub=error`);
  }

  return NextResponse.redirect(
    `${origin}/pro/inscription?step=5&sub=ok&session_id=${encodeURIComponent(sessionId)}`,
  );
}

/**
 * Confirmation via proxy vers stripe-checkout-confirm (Supabase Edge Function).
 * Aucun appel Stripe SDK ici — tout tourne sur Deno côté Supabase.
 */
export async function POST(request: Request) {
  let sessionId: string | undefined;
  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  // Récupérer le token Bearer (depuis le header ou la session cookie)
  let accessToken = extractBearer(request);

  if (!accessToken) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? null;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const res = await fetch(supabaseFunctionUrl("stripe-checkout-confirm"), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "apikey": getSupabaseAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = (await res.json()) as { ok?: boolean; status?: string; error?: string };

    if (!res.ok) {
      const httpStatus = data.error === "Session invalide" ? 403 : 500;
      console.error("[stripe/checkout/confirm POST] error:", data.error);
      return NextResponse.json({ error: data.error ?? "Confirmation échouée" }, { status: httpStatus });
    }

    return NextResponse.json({ ok: true, status: data.status });
  } catch (err) {
    console.error("[stripe/checkout/confirm POST] proxy error:", err);
    const message = err instanceof Error ? err.message : "Confirmation échouée";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
