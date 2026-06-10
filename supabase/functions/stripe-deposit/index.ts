import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://retvy.fr";

type BookingData = {
  style: string;
  zone: string;
  size: string;
  size_category: string;
  budget: number;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  project_description: string;
  reference_image_url?: string | null;
  reference_note?: string | null;
  client_id?: string | null;
};

type DepositBody = {
  bookingData?: BookingData;
  proSlug?: string;
  depositAmount?: number;
  reference?: string;
  bookingId?: string;
};

type ProProfileRow = {
  user_id: string;
  artist_name: string;
  studio: string | null;
  slug: string;
  stripe_account_id: string | null;
  stripe_connect_account_id: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveStripeAccountId(profile: ProProfileRow): string | null {
  return profile.stripe_account_id ?? profile.stripe_connect_account_id ?? null;
}

function parseDepositRules(raw: unknown): Array<{
  price_min: number;
  price_max: number | null;
  deposit_value: number;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        price_min: Number(row.price_min ?? 0),
        price_max:
          row.price_max == null ? null : Number(row.price_max),
        deposit_value: Number(row.deposit_value ?? 0),
      };
    })
    .filter((r) => Number.isFinite(r.deposit_value));
}

function computeDepositEur(
  budget: number,
  depositType: string,
  rules: ReturnType<typeof parseDepositRules>,
): number {
  const tier =
    rules.find(
      (r) =>
        budget >= r.price_min &&
        (r.price_max == null || budget <= r.price_max),
    ) ?? rules[0];

  if (!tier) return Math.max(50, Math.round(budget * 0.2));

  if (depositType === "percent") {
    return Math.max(50, Math.round((budget * tier.deposit_value) / 100));
  }
  return Math.max(50, tier.deposit_value);
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration Supabase incomplète" }, 503);
  }

  let body: DepositBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as DepositBody;
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  const bookingData = body.bookingData;
  const proSlug = body.proSlug?.trim().toLowerCase();
  const reference = body.reference?.trim();

  if (!bookingData || !proSlug || !reference) {
    return jsonResponse({ error: "bookingData, proSlug et reference requis" }, 400);
  }

  if (
    !bookingData.client_email ||
    !bookingData.slot_date ||
    !bookingData.slot_time ||
    !bookingData.project_description
  ) {
    return jsonResponse({ error: "Données de réservation incomplètes" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await admin
    .from("pro_profiles")
    .select(
      "user_id, artist_name, studio, slug, stripe_account_id, stripe_connect_account_id",
    )
    .eq("slug", proSlug)
    .maybeSingle();

  if (profileError || !profile?.user_id || !profile.artist_name) {
    return jsonResponse({ error: "Profil introuvable" }, 404);
  }

  const stripeAccountId = resolveStripeAccountId(profile as ProProfileRow);
  if (!stripeAccountId) {
    return jsonResponse({ error: "Tatoueur non connecté à Stripe" }, 400);
  }

  const stripe = new Stripe(stripeSecret);

  let connectAccount: Stripe.Account;
  try {
    connectAccount = await stripe.accounts.retrieve(stripeAccountId);
  } catch (err) {
    console.error("[stripe-deposit] retrieve account", err);
    return jsonResponse({ error: "Tatoueur non connecté à Stripe" }, 400);
  }

  if (!connectAccount.charges_enabled) {
    return jsonResponse({ error: "Tatoueur non connecté à Stripe" }, 400);
  }

  const { data: depositRow } = await admin
    .from("pro_deposit_settings")
    .select("deposit_type, cancellation_policy, rules")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const expectedDeposit = computeDepositEur(
    bookingData.budget,
    depositRow?.deposit_type ?? "fixed",
    parseDepositRules(depositRow?.rules),
  );

  const depositAmount = Number(body.depositAmount ?? expectedDeposit);
  const bookingId = body.bookingId?.trim();

  if (!Number.isFinite(depositAmount)) {
    return jsonResponse({ error: "Montant d'acompte invalide" }, 400);
  }

  if (bookingId) {
    const { data: existing } = await admin
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, user_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!existing || existing.user_id !== profile.user_id) {
      return jsonResponse({ error: "Réservation introuvable" }, 400);
    }
    if (existing.deposit_paid) {
      return jsonResponse({ error: "Acompte déjà payé" }, 400);
    }
    if (Math.abs(depositAmount - existing.deposit_amount) > 1) {
      return jsonResponse({ error: "Montant d'acompte invalide" }, 400);
    }
  } else if (Math.abs(depositAmount - expectedDeposit) > 1) {
    return jsonResponse({ error: "Montant d'acompte invalide" }, 400);
  }

  const amountCents = Math.max(100, Math.round(depositAmount * 100));

  const metadata: Record<string, string> = {
    kind: "deposit",
    pro_user_id: profile.user_id,
    artist_slug: proSlug,
    artist_name: profile.artist_name,
    artist_studio: profile.studio ?? "",
    slot_date: bookingData.slot_date,
    slot_time: bookingData.slot_time,
    project_summary: bookingData.project_description.slice(0, 480),
    style: bookingData.style,
    zone: bookingData.zone,
    size: bookingData.size,
    size_category: bookingData.size_category,
    duration_minutes: String(bookingData.duration_minutes),
    deposit_eur: String(depositAmount),
    client_user_id: bookingData.client_id ?? "",
    client_email: bookingData.client_email,
    client_name: bookingData.client_name,
    client_phone: bookingData.client_phone,
    reference,
    cancellation_policy: depositRow?.cancellation_policy ?? "48h",
    reference_image_url: bookingData.reference_image_url ?? "",
    booking_id: bookingId ?? "",
  };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: bookingData.client_email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amountCents,
              product_data: {
                name: `Acompte — ${profile.artist_name}`,
                description: bookingData.project_description.slice(0, 250),
              },
            },
          },
        ],
        success_url: `${APP_URL}/api/ink/${proSlug}/book/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/ink/${proSlug}/reserver?cancel=1`,
        metadata,
        payment_intent_data: {
          metadata,
        },
      },
      { stripeAccount: stripeAccountId },
    );

    if (!session.url) {
      return jsonResponse({ error: "Stripe n'a pas renvoyé d'URL" }, 500);
    }

    return jsonResponse({ url: session.url, reference, deposit: depositAmount });
  } catch (err) {
    console.error("[stripe-deposit]", err);
    const message =
      err instanceof Error ? err.message : "Erreur Stripe Checkout";
    return jsonResponse({ error: message }, 500);
  }
});
