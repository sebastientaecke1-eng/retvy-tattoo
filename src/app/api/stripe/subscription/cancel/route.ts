import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/stripe";

const STRIPE_API = "https://api.stripe.com/v1";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("pro_profiles")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  if (!profile?.stripe_subscription_id)
    return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 404 });
  if (profile.status === "canceled")
    return NextResponse.json({ error: "Abonnement déjà résilié" }, { status: 400 });

  const key = getStripeSecretKey();
  const subId = profile.stripe_subscription_id;

  const getRes = await fetch(`${STRIPE_API}/subscriptions/${subId}`, {
    headers: { Authorization: "Bearer " + key },
  });
  if (!getRes.ok) return NextResponse.json({ error: "Stripe error" }, { status: 502 });

  const sub = (await getRes.json()) as { current_period_end: number };
  const cancelAt = new Date(sub.current_period_end * 1000).toISOString();

  const patchBody = new URLSearchParams();
  patchBody.set("cancel_at_period_end", "true");
  const patchRes = await fetch(`${STRIPE_API}/subscriptions/${subId}`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: patchBody.toString(),
  });
  if (!patchRes.ok) return NextResponse.json({ error: "Stripe patch error" }, { status: 502 });

  await admin
    .from("pro_profiles")
    .update({ status: "canceling", trial_ends_at: cancelAt })
    .eq("user_id", user.id)
    .eq("is_sub_profile", false);

  return NextResponse.json({ ok: true, cancel_at: cancelAt });
}
