import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { getPriceId, getPromoPriceId, type PlanTier, type PlanBilling } from "@/lib/stripe/plans";
import { getBearerUser } from "@/lib/supabase/bearer-user";
import { createClient } from "@/lib/supabase/server";

const APP_URL = "https://retvy.fr";

const bodySchema = z.object({
  tier: z.enum(["1", "23", "3plus"]),
  billing: z.enum(["monthly", "annual"]),
  promo: z.boolean().default(false),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  userId: z.string().uuid(),
  referralCode: z.string().max(16).optional(),
});

export async function POST(request: Request) {
  // Auth
  const bearerUser = await getBearerUser(request);
  let userId: string | undefined = bearerUser?.id;

  if (!userId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  if (userId && userId !== body.userId) {
    return NextResponse.json({ error: "Utilisateur non autorisé" }, { status: 403 });
  }

  let priceId: string;
  let promoPriceId: string | undefined;

  try {
    priceId = getPriceId(body.tier as PlanTier, body.billing as PlanBilling);
    if (body.promo) {
      promoPriceId = getPromoPriceId();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Configuration Stripe incomplète";
    console.error("[stripe/checkout/create]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer_email: body.email,
      client_reference_id: body.userId,
      metadata: {
        user_id: body.userId,
        tier: body.tier,
        billing: body.billing,
        price_id: priceId,
        promo: body.promo ? "1" : "0",
        promo_price_id: promoPriceId ?? "",
        referral_code: body.referralCode?.toUpperCase().trim() ?? "",
      },
      success_url: `${APP_URL}/api/stripe/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pro/inscription?step=4&sub=cancel`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe n'a pas renvoyé d'URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Stripe";
    console.error("[stripe/checkout/create] stripe.checkout.sessions.create", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
