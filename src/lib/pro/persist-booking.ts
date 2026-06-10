import {
  formatBookingDateTimeParis,
  sendBookingNotificationPro,
  sendBookingRecapClient,
  type BookingEmailData,
} from "@/lib/brevo-booking";
import { combineBookingDateTime } from "@/lib/pro/ink-booking";
import type { CancellationPolicy } from "@/lib/pro/deposit-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingMetadata = {
  booking_id?: string;
  pro_user_id: string;
  artist_slug?: string;
  artist_name?: string;
  artist_studio?: string;
  slot_date: string;
  slot_time: string;
  project_summary?: string;
  style?: string;
  zone?: string;
  size?: string;
  budget?: string;
  duration_minutes?: string | number;
  deposit_eur?: string | number;
  client_user_id?: string;
  client_email?: string;
  client_name?: string;
  client_phone?: string;
  reference?: string;
  cancellation_policy?: string;
  reference_image_url?: string;
};

async function resolveProEmail(
  admin: ReturnType<typeof createAdminClient>,
  proUserId: string,
): Promise<string | null> {
  const { data: proUser } = await admin.auth.admin.getUserById(proUserId);
  return proUser.user?.email ?? null;
}

export async function buildBookingEmailPayload(
  meta: BookingMetadata,
  depositPaid: boolean,
): Promise<{
  bookingPayload: BookingEmailData;
  proEmail: string | null;
}> {
  const admin = createAdminClient();
  let studioAddress = meta.artist_studio ?? "";

  const { data: pro } = await admin
    .from("pro_profiles")
    .select("user_id, artist_name, address, studio, city, postal_code")
    .eq("user_id", meta.pro_user_id)
    .maybeSingle();

  if (pro?.address) {
    studioAddress = pro.studio
      ? `${pro.studio} — ${pro.address}`
      : pro.address;
    if (pro.city) {
      studioAddress = [studioAddress, pro.postal_code, pro.city]
        .filter(Boolean)
        .join(", ");
    }
  } else if (pro?.city) {
    studioAddress = [pro.studio, pro.city].filter(Boolean).join(" — ");
  }

  const depositEur = Number(meta.deposit_eur ?? 0);
  const bookingPayload: BookingEmailData = {
    clientEmail: meta.client_email ?? "",
    clientName: meta.client_name,
    clientPhone: meta.client_phone,
    artistName: meta.artist_name ?? pro?.artist_name ?? undefined,
    studioAddress,
    dateTimeParis: formatBookingDateTimeParis(meta.slot_date, meta.slot_time),
    style: meta.style,
    zone: meta.zone,
    size: meta.size,
    budget: meta.budget,
    projectSummary: meta.project_summary,
    deposit: depositEur > 0 ? depositEur : undefined,
    depositPaid,
    cancellationPolicy: meta.cancellation_policy,
    reference: meta.reference,
  };

  const proEmail = pro?.user_id
    ? await resolveProEmail(admin, pro.user_id)
    : null;

  return { bookingPayload, proEmail };
}

export async function insertBookingFromMetadata(
  meta: BookingMetadata,
  opts: { depositPaid: boolean; status: "confirmed" | "pending" },
) {
  const admin = createAdminClient();
  const depositEur = Number(meta.deposit_eur ?? 0);
  const bookingDate = combineBookingDateTime(meta.slot_date, meta.slot_time);

  const updatePayload = {
    deposit_paid: opts.depositPaid,
    status: opts.status,
    deposit_amount: depositEur,
    client_name: meta.client_name ?? "Client",
    client_email: meta.client_email?.trim().toLowerCase() ?? null,
    client_phone: meta.client_phone ?? null,
    project_description: meta.project_summary ?? null,
    style: meta.style ?? null,
    zone: meta.zone ?? null,
    size: meta.size ?? null,
    reference_image_url: meta.reference_image_url || null,
    duration_minutes: Number(meta.duration_minutes ?? 60),
    cancellation_policy:
      (meta.cancellation_policy as CancellationPolicy) ?? "48h",
    ...(meta.client_user_id
      ? { client_id: meta.client_user_id }
      : {}),
  };

  if (meta.booking_id) {
    const { error } = await admin
      .from("bookings")
      .update(updatePayload)
      .eq("id", meta.booking_id);
    if (error) throw new Error(error.message);
    return;
  }

  if (meta.client_email) {
    const { data: existing } = await admin
      .from("bookings")
      .select("id")
      .eq("user_id", meta.pro_user_id)
      .eq("booking_date", bookingDate)
      .eq("client_email", meta.client_email)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("bookings")
        .update(updatePayload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return;
    }
  }

  const { error } = await admin.from("bookings").insert({
    user_id: meta.pro_user_id,
    client_id: meta.client_user_id || null,
    client_name: meta.client_name ?? "Client",
    client_email: meta.client_email?.trim().toLowerCase() ?? null,
    client_phone: meta.client_phone ?? null,
    project_description: meta.project_summary ?? null,
    style: meta.style ?? null,
    zone: meta.zone ?? null,
    size: meta.size ?? null,
    reference_image_url: meta.reference_image_url || null,
    booking_date: bookingDate,
    duration_minutes: Number(meta.duration_minutes ?? 60),
    deposit_amount: depositEur,
    deposit_paid: opts.depositPaid,
    status: opts.status,
    cancellation_policy:
      (meta.cancellation_policy as CancellationPolicy) ?? "48h",
  });

  if (error) {
    console.error("[persist-booking] insert", error.message);
    throw new Error(error.message);
  }
}

type FulfillBookingOptions = {
  logPrefix?: string;
};

async function sendBookingEmails(
  bookingPayload: BookingEmailData,
  proEmail: string | null,
  logPrefix = "[persist-booking]",
) {
  const clientEmail = bookingPayload.clientEmail?.trim() ?? "";
  console.log(`${logPrefix} sending emails to:`, clientEmail || "(aucun)", proEmail ?? "(aucun)");

  if (!process.env.BREVO_API_KEY?.trim()) {
    console.error(
      `${logPrefix} BREVO_API_KEY absente ou vide — emails non envoyés`,
    );
    return;
  }

  if (clientEmail) {
    const clientResult = await sendBookingRecapClient(bookingPayload);
    if (!clientResult.ok) {
      console.error(`${logPrefix} email client échoué:`, clientResult.error);
    } else {
      console.log(`${logPrefix} email client envoyé`, clientResult.messageId ?? "");
    }
  } else {
    console.warn(`${logPrefix} email client ignoré — adresse manquante`);
  }

  if (proEmail) {
    const proResult = await sendBookingNotificationPro({
      ...bookingPayload,
      proEmail,
    });
    if (!proResult.ok) {
      console.error(`${logPrefix} email pro échoué:`, proResult.error);
    } else {
      console.log(`${logPrefix} email pro envoyé`, proResult.messageId ?? "");
    }
  } else {
    console.warn(`${logPrefix} email pro ignoré — adresse pro introuvable`);
  }

  console.log(`${logPrefix} emails sent`);
}

export async function fulfillDepositBooking(
  meta: BookingMetadata,
  opts?: FulfillBookingOptions,
) {
  const logPrefix = opts?.logPrefix ?? "[persist-booking/deposit]";

  console.log(`${logPrefix} enregistrement booking confirmé`);
  await insertBookingFromMetadata(meta, {
    depositPaid: true,
    status: "confirmed",
  });
  console.log(`${logPrefix} booking enregistré en base`);

  const { bookingPayload, proEmail } = await buildBookingEmailPayload(
    meta,
    true,
  );

  await sendBookingEmails(bookingPayload, proEmail, logPrefix).catch((err) =>
    console.error(`${logPrefix} emails exception:`, err),
  );
}

export async function fulfillPendingBooking(
  meta: BookingMetadata,
  opts?: FulfillBookingOptions,
) {
  const logPrefix = opts?.logPrefix ?? "[persist-booking/defer]";

  console.log(`${logPrefix} enregistrement booking pending`);
  await insertBookingFromMetadata(meta, {
    depositPaid: false,
    status: "pending",
  });
  console.log(`${logPrefix} booking enregistré en base`);

  const { bookingPayload, proEmail } = await buildBookingEmailPayload(
    meta,
    false,
  );

  await sendBookingEmails(bookingPayload, proEmail, logPrefix).catch((err) =>
    console.error(`${logPrefix} emails exception:`, err),
  );
}
