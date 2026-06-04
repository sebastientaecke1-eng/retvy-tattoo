import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/supabase/bearer-user";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

function appOrigin(): string {
  return "https://retvy.fr";
}

function subscriptionStatus(sub: Stripe.Subscription): string {
  return sub.status === "trialing"
    ? "trialing"
    : sub.status === "active"
      ? "active"
      : "pending";
}

async function persistSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string,
) {
  const admin = createAdminClient();
  const status = subscriptionStatus(sub);
  const { error } = await admin
    .from("pro_profiles")
    .update({
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      subscription_status: status,
      status,
      trial_ends_at: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return { status, userId };
}

/** Anciennes sessions mode=subscription (repli). */
async function syncSubscriptionCheckoutSession(
  sessionId: string,
  expectedUserId?: string,
): Promise<{ status: string; userId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null;

  if (!userId) {
    throw new Error("Session sans utilisateur");
  }

  if (expectedUserId && userId !== expectedUserId) {
    throw new Error("Session invalide");
  }

  const sub: Stripe.Subscription | null =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!sub) {
    throw new Error("Abonnement introuvable");
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  return persistSubscription(userId, sub, customerId);
}

/**
 * Étape 2 : session setup terminée → créer l'abonnement avec essai 30 jours.
 */
async function confirmSetupCheckoutSession(
  sessionId: string,
  expectedUserId?: string,
): Promise<{ status: string; userId: string }> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID non configurée");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent", "customer"],
  });

  if (session.mode === "subscription") {
    return syncSubscriptionCheckoutSession(sessionId, expectedUserId);
  }

  if (session.mode !== "setup") {
    throw new Error("Type de session Checkout non supporté");
  }

  if (session.status !== "complete") {
    throw new Error("Session Checkout non terminée");
  }

  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null;

  if (!userId) {
    throw new Error("Session sans utilisateur");
  }

  if (expectedUserId && userId !== expectedUserId) {
    throw new Error("Session invalide");
  }

  const setupIntent: Stripe.SetupIntent | null =
    typeof session.setup_intent === "string"
      ? await stripe.setupIntents.retrieve(session.setup_intent)
      : session.setup_intent;

  const paymentMethodId =
    typeof setupIntent?.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id;

  if (!paymentMethodId) {
    throw new Error("Moyen de paiement introuvable");
  }

  let customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.customer_details?.email ?? undefined,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("pro_profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.stripe_subscription_id) {
    const existing = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id,
    );
    if (existing.status === "trialing" || existing.status === "active") {
      return persistSubscription(userId, existing, customerId);
    }
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 30,
    default_payment_method: paymentMethodId,
    trial_settings: {
      end_behavior: { missing_payment_method: "cancel" },
    },
    metadata: { user_id: userId },
  });

  return persistSubscription(userId, subscription, customerId);
}

async function syncCheckoutSession(
  sessionId: string,
  expectedUserId?: string,
): Promise<{ status: string; userId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode === "setup") {
    return confirmSetupCheckoutSession(sessionId, expectedUserId);
  }

  return syncSubscriptionCheckoutSession(sessionId, expectedUserId);
}

function scheduleBackgroundSync(sessionId: string) {
  const task = syncCheckoutSession(sessionId).catch((err) => {
    console.error("[stripe/checkout/confirm GET bg]", err);
  });

  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(task);
  } catch {
    void task;
  }
}

/**
 * Retour Stripe Checkout : redirection immédiate, sync Stripe/Supabase en arrière-plan.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const origin = appOrigin();

  if (!sessionId) {
    return NextResponse.redirect(
      `${origin}/pro/inscription?step=4&sub=error`,
    );
  }

  scheduleBackgroundSync(sessionId);

  return NextResponse.redirect(
    `${origin}/pro/inscription?step=5&sub=ok`,
  );
}

/** Sync abonnement (wizard / repli). */
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

  const bearerUser = await getBearerUser(request);
  let userId = bearerUser?.id;

  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }

  try {
    const result = await syncCheckoutSession(sessionId, userId ?? undefined);
    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    console.error("[stripe/checkout/confirm POST]", err);
    const message =
      err instanceof Error ? err.message : "Confirmation échouée";
    const status = message === "Session invalide" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
