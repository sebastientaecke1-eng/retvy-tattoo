import { z } from "zod";
import {
  isSlotStillAvailable,
  loadProAvailabilityContext,
  proposeAvailableSlots,
} from "@/lib/pro/availability";
import { resolveBookingSlot } from "@/lib/pro/ink-booking";
import { computeDepositFromSettings } from "@/lib/pro/compute-deposit";
import { inkBookBodySchema } from "@/lib/pro/ink-booking-schema";
import { parseRulesFromDb } from "@/lib/pro/deposit-settings";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";

export type PreparedInkBooking = {
  body: z.infer<typeof inkBookBodySchema>;
  slug: string;
  proUserId: string;
  artistName: string;
  artistStudio: string;
  depositEur: number;
  reference: string;
  cancellationPolicy: "24h" | "48h" | "72h" | "non_refundable";
  stripeConnectAccountId: string | null;
};

export async function prepareInkBooking(
  slug: string,
  rawBody: unknown,
): Promise<
  | { ok: true; data: PreparedInkBooking }
  | { ok: false; status: number; error: string }
> {
  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.user_id || !profile.artist_name) {
    return { ok: false, status: 404, error: "Profil introuvable" };
  }

  let body: z.infer<typeof inkBookBodySchema>;
  try {
    body = inkBookBodySchema.parse(rawBody);
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return { ok: false, status: 400, error: msg ?? "Données invalides" };
  }

  const rangeStart = new Date();
  const rangeEnd = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ctx = await loadProAvailabilityContext(
    profile.user_id,
    rangeStart,
    rangeEnd,
  );

  const candidateSlots = proposeAvailableSlots({
    ctx,
    style: body.style,
    sizeCategory: body.size_category,
    preferredDates: [body.slot_date],
    count: 20,
    from: rangeStart,
  });

  const resolved = resolveBookingSlot({
    slot_date: body.slot_date,
    slot_time: body.slot_time,
    availableSlots: candidateSlots,
  });

  body = {
    ...body,
    slot_date: resolved.slot_date,
    slot_time: resolved.slot_time,
    duration_minutes: resolved.duration_minutes ?? body.duration_minutes,
  };

  if (
    !isSlotStillAvailable(
      ctx,
      body.slot_date,
      body.slot_time,
      body.style,
      body.size_category,
    )
  ) {
    return {
      ok: false,
      status: 409,
      error: "Ce créneau n'est plus disponible. Choisissez-en un autre.",
    };
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
  const reference = `RTVY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const cancellationPolicy =
    (depositRow?.cancellation_policy as PreparedInkBooking["cancellationPolicy"]) ??
    "48h";

  const { data: proRow } = await admin
    .from("pro_profiles")
    .select("stripe_connect_account_id, studio")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  return {
    ok: true,
    data: {
      body,
      slug,
      proUserId: profile.user_id,
      artistName: profile.artist_name,
      artistStudio: proRow?.studio ?? profile.studio ?? "",
      depositEur,
      reference,
      cancellationPolicy,
      stripeConnectAccountId: proRow?.stripe_connect_account_id ?? null,
    },
  };
}

export function bookingMetadataFromPrepared(prepared: PreparedInkBooking) {
  const { body } = prepared;
  return {
    kind: "deposit",
    pro_user_id: prepared.proUserId,
    artist_slug: prepared.slug,
    artist_name: prepared.artistName,
    artist_studio: prepared.artistStudio,
    slot_date: body.slot_date,
    slot_time: body.slot_time,
    project_summary: body.project_description.slice(0, 480),
    style: body.style,
    zone: body.zone,
    size: body.size,
    size_category: body.size_category,
    duration_minutes: String(body.duration_minutes),
    deposit_eur: String(prepared.depositEur),
    client_user_id: body.client_id ?? "",
    client_email: body.client_email,
    client_name: body.client_name,
    client_phone: body.client_phone,
    reference: prepared.reference,
    cancellation_policy: prepared.cancellationPolicy,
    reference_image_url: body.reference_image_url ?? "",
  };
}
