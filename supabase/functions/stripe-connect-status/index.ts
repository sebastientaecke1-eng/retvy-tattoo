import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type StatusBody = {
  userId?: string;
};

type ConnectStatusResult = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  account_id: string | null;
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

  if (req.method !== "POST" && req.method !== "GET") {
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

  let body: StatusBody = {};
  if (req.method === "POST") {
    try {
      const text = await req.text();
      if (text.trim()) body = JSON.parse(text) as StatusBody;
    } catch {
      return jsonResponse({ error: "Corps JSON invalide" }, 400);
    }
  }

  const userId = body.userId?.trim() || user.id;
  if (userId !== user.id) {
    return jsonResponse({ error: "userId invalide" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: profile, error: profileError } = await admin
      .from("pro_profiles")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[stripe-connect-status] profile read", profileError);
      return jsonResponse(
        { error: `Lecture profil pro: ${profileError.message}` },
        500,
      );
    }

    const stripeAccountId = profile?.stripe_account_id ?? null;

    let result: ConnectStatusResult;

    if (!stripeAccountId) {
      result = {
        connected: false,
        charges_enabled: false,
        payouts_enabled: false,
        account_id: null,
      };
    } else {
      const stripe = new Stripe(stripeSecret);
      const account = await stripe.accounts.retrieve(stripeAccountId);

      result = {
        connected: Boolean(account.charges_enabled),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        account_id: stripeAccountId,
      };
    }

    console.log("[stripe-connect-status] result:", JSON.stringify(result));

    return jsonResponse(result);
  } catch (err) {
    console.error("[stripe-connect-status] error:", err);
    const message =
      err instanceof Error ? err.message : "Erreur Stripe Connect";
    return jsonResponse({ error: message }, 500);
  }
});
