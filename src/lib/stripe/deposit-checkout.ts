import type Stripe from "stripe";
import { fulfillDepositBooking } from "@/lib/pro/persist-booking";
import { resolveBookingPaymentRefsFromSession } from "@/lib/stripe/booking-payment-refs";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export function connectAccountIdForDeposit(
  session: Stripe.Checkout.Session,
  eventAccount?: string | null,
): string | null {
  const fromMeta = session.metadata?.connect_account_id?.trim();
  if (fromMeta) return fromMeta;
  const fromEvent = eventAccount?.trim();
  return fromEvent || null;
}

export async function retrieveDepositCheckoutSession(
  sessionId: string,
  connectAccountId?: string | null,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const opts: Stripe.Checkout.SessionRetrieveParams = {
    expand: ["payment_intent"],
  };

  if (connectAccountId) {
    return stripe.checkout.sessions.retrieve(sessionId, opts, {
      stripeAccount: connectAccountId,
    });
  }

  return stripe.checkout.sessions.retrieve(sessionId, opts);
}

export async function fulfillDepositFromCheckoutSession(
  session: Stripe.Checkout.Session,
  opts?: {
    connectAccountId?: string | null;
    expectedSlug?: string;
    logPrefix?: string;
  },
): Promise<void> {
  const logPrefix = opts?.logPrefix ?? "[stripe/deposit-checkout]";
  const connectAccountId = connectAccountIdForDeposit(
    session,
    opts?.connectAccountId,
  );

  if (session.mode !== "payment" || session.metadata?.kind !== "deposit") {
    throw new Error("Session de paiement invalide");
  }

  if (session.status !== "complete") {
    throw new Error("Paiement non terminé");
  }

  const slug = session.metadata?.artist_slug ?? "";
  if (opts?.expectedSlug && slug !== opts.expectedSlug) {
    throw new Error("Session invalide pour ce profil");
  }

  const meta = session.metadata;
  if (!meta?.pro_user_id || !meta.slot_date || !meta.slot_time) {
    throw new Error("Métadonnées de réservation manquantes");
  }

  const stripe_payment = await resolveBookingPaymentRefsFromSession(
    session,
    connectAccountId,
  );

  const newBookingId = await fulfillDepositBooking(
    {
      booking_id: meta.booking_id || undefined,
      pro_user_id: meta.pro_user_id,
      artist_slug: meta.artist_slug,
      artist_name: meta.artist_name,
      artist_studio: meta.artist_studio,
      slot_date: meta.slot_date,
      slot_time: meta.slot_time,
      project_summary: meta.project_summary,
      style: meta.style,
      zone: meta.zone,
      size: meta.size,
      duration_minutes: meta.duration_minutes,
      deposit_eur: meta.deposit_eur,
      client_user_id: meta.client_user_id,
      client_email: meta.client_email,
      client_name: meta.client_name,
      client_phone: meta.client_phone,
      reference: meta.reference || session.id.slice(-8).toUpperCase(),
      cancellation_policy: meta.cancellation_policy,
      reference_image_url: meta.reference_image_url,
      color_preference: meta.color_preference,
      stripe_payment,
    },
    { logPrefix },
  );

  // Lier le consentement électronique à la réservation (par email, consentement récent < 2h)
  if (newBookingId && meta.client_email) {
    const admin = createAdminClient();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    admin
      .from("booking_consents")
      .update({ booking_id: newBookingId })
      .eq("client_email", meta.client_email.trim().toLowerCase())
      .is("booking_id", null)
      .gte("signed_at", twoHoursAgo)
      .order("signed_at", { ascending: false })
      .limit(1)
      .then(({ error }) => {
        if (error) console.warn(`${logPrefix} consent link:`, error);
      }, (err: Error) => console.warn(`${logPrefix} consent link err:`, err));
  }
}

export async function reconcileDepositBookingById(
  bookingId: string,
  knownSessionId?: string,
): Promise<{ sessionId: string }> {
  const admin = createAdminClient();
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, user_id, status, deposit_paid")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    throw new Error(bookingErr?.message ?? "Réservation introuvable");
  }

  if (booking.deposit_paid && booking.status === "confirmed") {
    throw new Error("Réservation déjà confirmée avec acompte payé");
  }

  const { data: pro, error: proErr } = await admin
    .from("pro_profiles")
    .select("stripe_account_id, slug")
    .eq("user_id", booking.user_id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  if (proErr || !pro) {
    throw new Error(proErr?.message ?? "Profil pro introuvable");
  }

  const connectAccountId = pro.stripe_account_id?.trim() || null;
  const stripe = getStripe();
  const listOpts = connectAccountId
    ? { stripeAccount: connectAccountId }
    : undefined;

  if (knownSessionId?.trim()) {
    const fullSession = await retrieveDepositCheckoutSession(
      knownSessionId.trim(),
      connectAccountId,
    );
    await fulfillDepositFromCheckoutSession(fullSession, {
      connectAccountId,
      expectedSlug: pro.slug ?? undefined,
      logPrefix: `[reconcile-deposit/${bookingId}]`,
    });
    return { sessionId: knownSessionId.trim() };
  }

  let session: Stripe.Checkout.Session | undefined;
  let startingAfter: string | undefined;

  for (let page = 0; page < 5 && !session; page += 1) {
    const listed = await stripe.checkout.sessions.list(
      {
        limit: 100,
        status: "complete",
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      listOpts,
    );

    session = listed.data.find(
      (item) => item.metadata?.booking_id === bookingId,
    );

    if (!listed.has_more || session) break;
    startingAfter = listed.data.at(-1)?.id;
    if (!startingAfter) break;
  }

  if (!session) {
    throw new Error(
      "Session Checkout introuvable. Relancez avec le session_id copié depuis Stripe Dashboard.",
    );
  }

  const fullSession = await retrieveDepositCheckoutSession(
    session.id,
    connectAccountId,
  );

  await fulfillDepositFromCheckoutSession(fullSession, {
    connectAccountId,
    expectedSlug: pro.slug ?? undefined,
    logPrefix: `[reconcile-deposit/${bookingId}]`,
  });

  return { sessionId: session.id };
}
