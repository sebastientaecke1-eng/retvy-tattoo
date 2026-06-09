import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { fulfillDepositBooking } from "@/lib/pro/persist-booking";
import { getStripe } from "@/lib/stripe";

const APP_URL = "https://retvy.fr";

async function confirmDepositSession(sessionId: string, expectedSlug: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "payment" || session.metadata?.kind !== "deposit") {
    throw new Error("Session de paiement invalide");
  }

  if (session.status !== "complete") {
    throw new Error("Paiement non terminé");
  }

  const slug = session.metadata?.artist_slug ?? "";
  if (slug !== expectedSlug) {
    throw new Error("Session invalide pour ce profil");
  }

  const meta = session.metadata;
  if (!meta?.pro_user_id || !meta.slot_date || !meta.slot_time) {
    throw new Error("Métadonnées de réservation manquantes");
  }

  await fulfillDepositBooking({
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
    reference: meta.reference,
    cancellation_policy: meta.cancellation_policy,
    reference_image_url: meta.reference_image_url,
  });
}

function scheduleBackgroundConfirm(sessionId: string, slug: string) {
  const task = confirmDepositSession(sessionId, slug).catch((err) => {
    console.error("[ink/book/confirm bg]", err);
  });

  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(task);
  } catch {
    void task;
  }
}

/** Retour Stripe Checkout acompte : redirection immédiate, sync en arrière-plan. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(
      `${APP_URL}/ink/${slug}/reserver?cancel=1`,
    );
  }

  scheduleBackgroundConfirm(sessionId, slug);

  return NextResponse.redirect(
    `${APP_URL}/ink/${slug}/reserver?success=1`,
  );
}
