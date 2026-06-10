import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";
import type { StripeConnectStatus } from "@/lib/stripe/connect";

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

export async function GET(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const supabaseUrl = getSupabaseUrl().replace(/\/$/, "");
  const functionUrl = `${supabaseUrl}/functions/v1/stripe-connect-status`;

  try {
    console.log("[stripe/connect/status] proxy → edge function", {
      userId: user.id,
    });

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: getSupabaseAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const data = (await res.json()) as StripeConnectStatus & { error?: string };

    if (!res.ok) {
      console.error("[stripe/connect/status] edge function error", {
        status: res.status,
        error: data.error,
      });
      return NextResponse.json(
        { error: data.error ?? "Erreur Stripe Connect" },
        { status: res.status },
      );
    }

    console.log("[stripe/connect/status] result:", JSON.stringify(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[stripe/connect/status] proxy error:", error);
    const message =
      error instanceof Error ? error.message : "Erreur Stripe Connect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
