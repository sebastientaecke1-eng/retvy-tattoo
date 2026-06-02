import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID non configurée" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl =
    body.successUrl ?? `${origin}/pro/inscription?sub=ok`;
  const cancelUrl =
    body.cancelUrl ?? `${origin}/pro/inscription?sub=cancel`;

  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("pro_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: body.email,
      name: body.name,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("pro_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 60,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
      metadata: { user_id: user.id },
    },
    payment_method_collection: "always",
    success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { user_id: user.id, kind: "pro_subscription" },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe n'a pas renvoyé d'URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
