import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMO_DURATION_MONTHS = 1;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function subscriptionStatus(sub: Stripe.Subscription): string {
  if (sub.status === "trialing") return "trialing";
  if (sub.status === "active") return "active";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration serveur incomplète" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Non authentifié" }, 401);

  let sessionId: string | undefined;
  try {
    const text = await req.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { sessionId?: string };
      sessionId = body.sessionId;
    }
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400);
  }

  if (!sessionId) return jsonResponse({ error: "sessionId requis" }, 400);

  const stripe = new Stripe(stripeSecret);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent", "customer"],
    });

    if (session.mode !== "setup") {
      return jsonResponse({ error: "Type de session non supporté" }, 400);
    }
    if (session.status !== "complete") {
      return jsonResponse({ error: "Session non terminée" }, 400);
    }

    const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
    if (!userId) return jsonResponse({ error: "Session sans utilisateur" }, 400);
    if (userId !== user.id) return jsonResponse({ error: "Session invalide" }, 403);

    const setupIntent = typeof session.setup_intent === "string"
      ? await stripe.setupIntents.retrieve(session.setup_intent)
      : session.setup_intent as Stripe.SetupIntent | null;

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : (setupIntent?.payment_method as Stripe.PaymentMethod | null)?.id ?? null;

    if (!paymentMethodId) return jsonResponse({ error: "Moyen de paiement introuvable" }, 400);

    let customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.customer_details?.email ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const { data: profile } = await admin
      .from("pro_profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.stripe_subscription_id) {
      const existing = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (existing.status === "trialing" || existing.status === "active") {
        const status = subscriptionStatus(existing);
        await admin.from("pro_profiles").update({
          stripe_subscription_id: existing.id,
          stripe_customer_id: customerId,
          subscription_status: status,
          status,
        }).eq("user_id", userId);
        return jsonResponse({ ok: true, status });
      }
    }

    const priceId = session.metadata?.price_id?.trim();
    if (!priceId) return jsonResponse({ error: "price_id introuvable dans la session" }, 400);

    const wantsPromo = session.metadata?.promo === "1";
    const promoPriceId = session.metadata?.promo_price_id?.trim();
    const referralCode = session.metadata?.referral_code?.trim();
    const hasReferral = !!referralCode;

    let subscription: Stripe.Subscription;

    if (wantsPromo && promoPriceId) {
      const now = Math.floor(Date.now() / 1000);
      const schedule = await stripe.subscriptionSchedules.create({
        customer: customerId,
        start_date: now,
        default_settings: { default_payment_method: paymentMethodId },
        phases: [
          {
            items: [{ price: promoPriceId, quantity: 1 }],
            // @ts-expect-error
            iterations: PROMO_DURATION_MONTHS,
          },
          { items: [{ price: priceId, quantity: 1 }] },
        ],
        metadata: { user_id: userId },
      });

      const subId =
        typeof schedule.subscription === "string"
          ? schedule.subscription
          : (schedule.subscription as Stripe.Subscription | null)?.id;

      if (!subId) return jsonResponse({ error: "Schedule sans abonnement" }, 500);
      subscription = await stripe.subscriptions.retrieve(subId);
    } else {
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        ...(hasReferral ? { trial_period_days: 30 } : {}),
        default_payment_method: paymentMethodId,
        ...(hasReferral
          ? { trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
          : {}),
        metadata: { user_id: userId },
      });
    }

    const status = subscriptionStatus(subscription);
    await admin.from("pro_profiles").update({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      subscription_status: status,
      status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    }).eq("user_id", userId);

    if (hasReferral) {
      try {
        const { data: parrainProfile } = await admin
          .from("pro_profiles")
          .select("user_id, stripe_subscription_id")
          // @ts-expect-error
          .eq("referral_code", referralCode.toUpperCase())
          .maybeSingle();

        if (parrainProfile?.user_id) {
          await (admin.from("pro_profiles") as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
          }).update({ referred_by: referralCode.toUpperCase() }).eq("user_id", userId);

          if (parrainProfile.stripe_subscription_id) {
            const parrainCoupon = await stripe.coupons.create({
              percent_off: 100,
              duration: "once",
              name: "Mois offert — parrainage Retvy",
              metadata: { type: "parrain_reward", parrain_user_id: parrainProfile.user_id },
            });
            await stripe.subscriptions.update(parrainProfile.stripe_subscription_id, {
              discounts: [{ coupon: parrainCoupon.id }],
            });
          }

          if (wantsPromo) {
            const parraineeCoupon = await stripe.coupons.create({
              percent_off: 100,
              duration: "once",
              name: "Mois offert — parrainé Retvy (4ème mois)",
              metadata: { type: "parrainé_bonus", user_id: userId },
            });
            await stripe.subscriptions.update(subscription.id, {
              discounts: [{ coupon: parraineeCoupon.id }],
            });
          }
        }
      } catch (refErr) {
        console.error("[stripe-checkout-confirm] referral error:", refErr);
      }
    }

    return jsonResponse({ ok: true, status });
  } catch (err) {
    console.error("[stripe-checkout-confirm] error:", err);
    const message = err instanceof Error ? err.message : "Erreur de confirmation";
    return jsonResponse({ error: message }, 500);
  }
});
