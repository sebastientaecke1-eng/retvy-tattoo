import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL")?.trim() || "https://retvy.fr";

type OnboardBody = {
  userId?: string;
  context?: "dashboard" | "onboarding";
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    return jsonResponse({ error: "STRIPE_SECRET_KEY manquant" }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration Supabase incomplète" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  let body: OnboardBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as OnboardBody;
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const userId = body.userId?.trim() || user.id;
  if (userId !== user.id) {
    return jsonResponse({ error: "userId invalide" }, 403);
  }

  const context = body.context === "onboarding" ? "onboarding" : "dashboard";
  const onboarding = context === "onboarding";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: profile, error: profileError } = await admin
      .from("pro_profiles")
      .select("user_id, artist_name, stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[stripe-connect-onboard] profile read", profileError);
      return jsonResponse(
        { error: `Lecture profil pro: ${profileError.message}` },
        500,
      );
    }

    if (!profile?.user_id) {
      return jsonResponse(
        { error: "Profil pro introuvable — complétez votre inscription pro" },
        404,
      );
    }

    const stripe = new Stripe(stripeSecret);
    let accountId = profile.stripe_account_id;

    if (!accountId) {
      console.log("[stripe-connect-onboard] creating express account", {
        userId,
      });
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: userId },
      });
      accountId = account.id;

      const { data: updated, error: updateError } = await admin
        .from("pro_profiles")
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("stripe_account_id")
        .single();

      if (updateError) {
        console.error("[stripe-connect-onboard] profile update", updateError);
        return jsonResponse(
          { error: `Sauvegarde stripe_account_id: ${updateError.message}` },
          500,
        );
      }

      if (!updated?.stripe_account_id) {
        return jsonResponse(
          { error: "stripe_account_id non enregistré en base" },
          500,
        );
      }
    }

    console.log("[stripe-connect-onboard] account link", {
      userId,
      accountId,
      context,
    });

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: onboarding
        ? `${APP_URL}/pro/inscription?connect=refresh`
        : `${APP_URL}/pro/dashboard?connect=refresh`,
      return_url: onboarding
        ? `${APP_URL}/pro/inscription?connect=done`
        : `${APP_URL}/pro/dashboard?connect=success`,
      type: "account_onboarding",
    });

    if (!accountLink.url) {
      return jsonResponse(
        { error: "Stripe n'a pas renvoyé d'URL d'onboarding" },
        500,
      );
    }

    return jsonResponse({ url: accountLink.url, accountId });
  } catch (err) {
    console.error("[stripe-connect-onboard] error:", err);
    const message =
      err instanceof Error ? err.message : "Erreur Stripe Connect";
    return jsonResponse({ error: message }, 500);
  }
});
