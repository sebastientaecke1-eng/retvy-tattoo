import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

  const payload = {
    status: nextStatus,
    subscription_status: nextStatus,
    trial_ends_at: trialEndsAt,
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
  };

  const query = admin.from("pro_profiles").update(payload);
  if (userId) {
    await query.eq("user_id", userId);
  } else {
    await query.eq("stripe_subscription_id", sub.id);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET non configurée" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: idemErr } = await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: JSON.parse(JSON.stringify(event.data.object)),
  });

  if (idemErr?.code === "23505") {
    return NextResponse.json({ duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
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
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from("pro_profiles")
          .update({ status: "canceled", subscription_status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
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

    await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
  } catch (err) {
    console.error("[stripe/webhook]", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
