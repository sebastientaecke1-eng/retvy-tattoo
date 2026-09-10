import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripeSecretKey } from "@/lib/stripe";
import { getPriceId, getPromoPriceId, type PlanTier, type PlanBilling } from "@/lib/stripe/plans";
import { getBearerUser } from "@/lib/supabase/bearer-user";
import { createClient } from "@/lib/supabase/server";

const APP_URL = "https://retvy.fr";
const STRIPE_API = "https://api.stripe.com/v1";

const bodySchema = z.object({
  tier: z.enum(["1", "23", "3plus"]),
  billing: z.enum(["monthly", "annual"]),
  promo: z.boolean().default(false),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  userId: z.string().uuid(),
  referralCode: z.string().max(16).optional(),
});

/** Appel direct à l'API Stripe via fetch() natif — compatible Cloudflare Workers. */
async function createStripeCheckoutSession(params: {
  secretKey: string;
  email: string;
  userId: string;
  priceId: string;
  tier: string;
  billing: string;
  promo: boolean;
  promoPriceId?: string;
  referralCode?: string;
}): Promise<{ url: string }> {
  const body = new URLSearchParams();
  body.set("mode", "setup");
  body.set("payment_method_types[0]", "card");
  body.set("customer_email", params.email);
  body.set("client_reference_id", params.userId);
  body.set("metadata[user_id]", params.userId);
  body.set("metadata[tier]", params.tier);
  body.set("metadata[billing]", params.billing);
  body.set("metadata[price_id]", params.priceId);
  body.set("metadata[promo]", params.promo ? "1" : "0");
  body.set("metadata[promo_price_id]", params.promoPriceId ?? "");
  body.set("metadata[referral_code]", params.referralCode?.toUpperCase().trim() ?? "");
  body.set("success_url", `${APP_URL}/api/stripe/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${APP_URL}/pro/inscription?step=4&sub=cancel`);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json() as { url?: string; error?: { message: string } };

  if (!res.ok) {
    const msg = data.error?.message ?? `Stripe API error ${res.status}`;
    console.error("[stripe/checkout/create] Stripe API error", { status: res.status, msg });
    throw new Error(msg);
  }

  if (!data.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  }

  return { url: data.url };
}

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
  let secretKey: string;

  try {
    secretKey = getStripeSecretKey();
    priceId = getPriceId(body.tier as PlanTier, body.billing as PlanBilling);
    if (body.promo) {
      promoPriceId = getPromoPriceId();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Configuration Stripe incomplète";
    console.error("[stripe/checkout/create] config error", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    const session = await createStripeCheckoutSession({
      secretKey,
      email: body.email,
      userId: body.userId,
      priceId,
      tier: body.tier,
      billing: body.billing,
      promo: body.promo,
      promoPriceId,
      referralCode: body.referralCode,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Stripe";
    console.error("[stripe/checkout/create] checkout error", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
