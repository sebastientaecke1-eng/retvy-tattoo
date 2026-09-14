import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillDepositFromCheckoutSession } from "@/lib/stripe/deposit-checkout";
import { constructStripeWebhookEvent } from "@/lib/stripe/webhook-verify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function priceIdToTier(priceId: string): "1" | "23" | "3plus" | null {
  const env = process.env;
  const priceMap: Record<string, "1" | "23" | "3plus"> = {};
  if (env.STRIPE_PRICE_1_MONTHLY)     priceMap[env.STRIPE_PRICE_1_MONTHLY.trim()]      = "1";
  if (env.STRIPE_PRICE_1_ANNUAL)      priceMap[env.STRIPE_PRICE_1_ANNUAL.trim()]       = "1";
  if (env.STRIPE_PRICE_23_MONTHLY)    priceMap[env.STRIPE_PRICE_23_MONTHLY.trim()]     = "23";
  if (env.STRIPE_PRICE_23_ANNUAL)     priceMap[env.STRIPE_PRICE_23_ANNUAL.trim()]      = "23";
  if (env.STRIPE_PRICE_3PLUS_MONTHLY) priceMap[env.STRIPE_PRICE_3PLUS_MONTHLY.trim()]  = "3plus";
  if (env.STRIPE_PRICE_3PLUS_ANNUAL)  priceMap[env.STRIPE_PRICE_3PLUS_ANNUAL.trim()]   = "3plus";
  return priceMap[priceId] ?? null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const userId = sub.metadata?.user_id;
  const trialEndsAt = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  const nextStatus =
    sub.status === "trialing"
      ? "trialing"
      : sub.status === "active"
        ? "active"
        : sub.status === "past_due"
          ? "past_due"
          : sub.status === "canceled" || sub.status === "incomplete_expired"
            ? "canceled"
            : "pending";

  // Détecter le tier depuis le price ID de l'abonnement
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  const tier = priceIdToTier(priceId);

  const payload = {
    status: nextStatus,
    subscription_status: nextStatus,
    trial_ends_at: trialEndsAt,
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    ...(tier ? { subscription_tier: tier } : {}),
  };

  const query = admin.from("pro_profiles").update(payload);
  if (userId) {
    await query.eq("user_id", userId);
  } else {
    await query.eq("stripe_subscription_id", sub.id);
  }
}

export async function POST(request: Request) {
  const hasPlatformSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const hasConnectSecret = Boolean(
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim(),
  );

  if (!hasPlatformSecret && !hasConnectSecret) {
    return NextResponse.json(
      { error: "Secret webhook Stripe non configuré" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("[stripe/webhook] signature", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const connectAccountId = event.account ?? null;
  const admin = createAdminClient();

  const { error: idemErr } = await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: JSON.parse(JSON.stringify(event.data.object)),
  });

  if (idemErr?.code === "23505") {
    return NextResponse.json({ duplicate: true });
  }

  if (idemErr) {
    console.error("[stripe/webhook] stripe_events insert", idemErr);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.metadata?.kind === "deposit") {
          await fulfillDepositFromCheckoutSession(session, {
            connectAccountId,
            logPrefix: "[stripe/webhook]",
          }).catch((err) =>
            console.error("[stripe/webhook] deposit fulfill", err),
          );
        }

        if (!connectAccountId && session.mode === "subscription") {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          const userId =
            session.client_reference_id ?? session.metadata?.user_id;
          if (userId && subId) {
            await admin
              .from("pro_profiles")
              .update({
                stripe_subscription_id: subId,
                stripe_customer_id:
                  typeof session.customer === "string"
                    ? session.customer
                    : session.customer?.id,
                status: "trialing",
                subscription_status: "trialing",
              })
              .eq("user_id", userId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        if (!connectAccountId) {
          await syncSubscription(event.data.object as Stripe.Subscription);
        }
        break;
      case "customer.subscription.deleted": {
        if (!connectAccountId) {
          const sub = event.data.object as Stripe.Subscription;
          await admin
            .from("pro_profiles")
            .update({ status: "canceled", subscription_status: "canceled" })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;
        const ready =
          account.details_submitted &&
          account.charges_enabled &&
          account.payouts_enabled;
        if (userId && ready) {
          await admin
            .from("pro_profiles")
            .update({ status: "active" })
            .eq("user_id", userId);
        }
        break;
      }
      default:
        break;
    }

    const { error: processedErr } = await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    if (processedErr) {
      console.error("[stripe/webhook] stripe_events processed_at", processedErr);
    }
  } catch (err) {
    console.error("[stripe/webhook]", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
