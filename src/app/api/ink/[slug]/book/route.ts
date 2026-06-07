import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import {
  isSlotStillAvailable,
  loadProAvailabilityContext,
} from "@/lib/pro/availability";
import { computeDepositFromSettings } from "@/lib/pro/compute-deposit";
import { inkBookBodySchema } from "@/lib/pro/ink-booking-schema";
import { combineBookingDateTime } from "@/lib/pro/ink-booking";
import { parseRulesFromDb } from "@/lib/pro/deposit-settings";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.user_id || !profile.artist_name) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  let body: z.infer<typeof inkBookBodySchema>;
  try {
    body = inkBookBodySchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ctx = await loadProAvailabilityContext(
    profile.user_id,
    rangeStart,
    rangeEnd,
  );

  if (
    !isSlotStillAvailable(
      ctx,
      body.slot_date,
      body.slot_time,
      body.style,
      body.size_category,
    )
  ) {
    return NextResponse.json(
      { error: "Ce créneau n'est plus disponible. Choisissez-en un autre." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { data: depositRow } = await admin
    .from("pro_deposit_settings")
    .select("deposit_type, cancellation_policy, rules")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const depositSettings = depositRow
    ? {
        deposit_type: depositRow.deposit_type,
        rules: parseRulesFromDb(depositRow.rules),
      }
    : undefined;

  const depositEur = computeDepositFromSettings(body.budget, depositSettings);
  const amountCents = Math.max(100, Math.round(depositEur * 100));
  const reference = `RTVY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const cancellationPolicy =
    depositRow?.cancellation_policy ?? "48h";

  const { data: proRow } = await admin
    .from("pro_profiles")
    .select("stripe_connect_account_id, studio")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const stripe = getStripe();
  const base = appUrl();

  const metadata: Record<string, string> = {
    kind: "deposit",
    pro_user_id: profile.user_id,
    artist_slug: slug,
    artist_name: profile.artist_name,
    artist_studio: proRow?.studio ?? profile.studio ?? "",
    slot_date: body.slot_date,
    slot_time: body.slot_time,
    project_summary: body.project_description.slice(0, 480),
    style: body.style,
    zone: body.zone,
    size: body.size,
    size_category: body.size_category,
    duration_minutes: String(body.duration_minutes),
    price_min: String(body.budget),
    price_max: String(body.budget),
    deposit_eur: String(depositEur),
    client_user_id: body.client_id ?? "",
    client_email: body.client_email,
    client_name: body.client_name,
    client_phone: body.client_phone,
    reference,
    cancellation_policy: cancellationPolicy,
    reference_image_url: body.reference_image_url ?? "",
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: body.client_email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Acompte — ${profile.artist_name}`,
            description: body.project_description.slice(0, 250),
          },
        },
      },
    ],
    success_url: `${base}/ink/${slug}/reserver?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/ink/${slug}/reserver?cancel=1`,
    metadata,
  };

  if (proRow?.stripe_connect_account_id) {
    sessionParams.payment_intent_data = {
      transfer_data: { destination: proRow.stripe_connect_account_id },
      application_fee_amount: 0,
      metadata,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({
    url: session.url,
    reference,
    deposit: depositEur,
    booking_preview: {
      booking_date: combineBookingDateTime(body.slot_date, body.slot_time),
      duration_minutes: body.duration_minutes,
    },
  });
}
