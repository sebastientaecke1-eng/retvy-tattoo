import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "STRIPE_SECRET_KEY non configurée";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { data: profile } = await admin
      .from("pro_profiles")
      .select("stripe_connect_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = profile?.stripe_connect_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      await admin
        .from("pro_profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("user_id", user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/pro/inscription?connect=refresh`,
      return_url: `${origin}/pro/inscription?connect=done`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("[stripe/connect]", err);
    const message =
      err instanceof Error ? err.message : "Erreur Stripe Connect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
