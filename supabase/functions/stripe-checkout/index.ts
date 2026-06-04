import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** URL de retour Stripe (placeholder remplacé par Stripe à la redirection). */
const CHECKOUT_SUCCESS_URL =
  "https://retvy.fr/api/stripe/checkout/confirm?session_id={CHECKOUT_SESSION_ID}";
const CHECKOUT_CANCEL_URL = "https://retvy.fr/pro/inscription?sub=cancel";

type CheckoutBody = {
  email?: string;
  name?: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
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

  let body: CheckoutBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as CheckoutBody;
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  if (body.userId && body.userId !== user.id) {
    return jsonResponse({ error: "userId invalide" }, 403);
  }

  const checkoutEmail = (body.email ?? user.email ?? "").trim();
  if (!checkoutEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutEmail)) {
    return jsonResponse(
      { error: "Email invalide pour Stripe Checkout" },
      400,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin
    .from("pro_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = existing?.stripe_customer_id ?? null;
  const stripe = new Stripe(stripeSecret);

  try {
    /** Étape 1 : collecte carte (setup). Abonnement créé dans /api/stripe/checkout/confirm. */
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: "eur",
      client_reference_id: user.id,
      success_url: CHECKOUT_SUCCESS_URL,
      cancel_url: CHECKOUT_CANCEL_URL,
      metadata: { user_id: user.id, kind: "pro_subscription_setup" },
      setup_intent_data: {
        metadata: { user_id: user.id },
      },
      ...(customerId
        ? { customer: customerId }
        : { customer_email: checkoutEmail }),
    });

    if (!session.url) {
      return jsonResponse({ error: "Stripe n'a pas renvoyé d'URL" }, 500);
    }

    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error("[stripe-checkout]", err);
    const message =
      err instanceof Error ? err.message : "Erreur Stripe Checkout";
    return jsonResponse({ error: message }, 500);
  }
});
