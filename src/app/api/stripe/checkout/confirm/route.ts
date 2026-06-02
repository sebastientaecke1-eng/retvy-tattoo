import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/** Sync abonnement après retour Checkout (utile si webhook local indisponible). */
export async function POST(request: Request) {
  const { sessionId } = (await request.json()) as { sessionId?: string };
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.metadata?.user_id && session.metadata.user_id !== user.id) {
    return NextResponse.json({ error: "Session invalide" }, { status: 403 });
  }

  const sub =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!sub) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  const status =
    sub.status === "trialing"
      ? "trialing"
      : sub.status === "active"
        ? "active"
        : "pending";

  const admin = createAdminClient();
  await admin
    .from("pro_profiles")
    .update({
      stripe_subscription_id: sub.id,
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscription_status: status,
      status,
      trial_ends_at: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, status });
}
