import {
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
    .select("user_id, address, studio")
    .eq("user_id", meta.pro_user_id)
    .maybeSingle();

  if (pro?.address) {
    studioAddress = pro.studio
      ? `${pro.studio} — ${pro.address}`
      : pro.address;
  }

  const depositEur = Number(meta.deposit_eur ?? 0);
  const bookingPayload: BookingEmailData = {
    clientEmail: meta.client_email ?? "",
    clientName: meta.client_name,
    clientPhone: meta.client_phone,
    artistName: meta.artist_name,
    studioAddress,
    date: meta.slot_date,
    time: meta.slot_time,
    projectSummary: meta.project_summary,
    deposit: depositPaid ? depositEur : "En attente (non payé)",
    reference: meta.reference,
  };

  let proEmail: string | null = null;
  if (pro?.user_id) {
    const { data: proUser } = await admin.auth.admin.getUserById(pro.user_id);
    proEmail = proUser.user?.email ?? null;
  }

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

export async function fulfillDepositBooking(meta: BookingMetadata) {
  await insertBookingFromMetadata(meta, {
    depositPaid: true,
    status: "confirmed",
  });

  const { bookingPayload, proEmail } = await buildBookingEmailPayload(
    meta,
    true,
  );

  if (bookingPayload.clientEmail && process.env.BREVO_API_KEY) {
    await sendBookingRecapClient(bookingPayload).catch((err) =>
      console.error("[persist-booking] email client", err),
    );
  }

  if (proEmail && process.env.BREVO_API_KEY) {
    await sendBookingNotificationPro({
      ...bookingPayload,
      proEmail,
    }).catch((err) => console.error("[persist-booking] email pro", err));
  }
}

export async function fulfillPendingBooking(meta: BookingMetadata) {
  await insertBookingFromMetadata(meta, {
    depositPaid: false,
    status: "pending",
  });

  const { bookingPayload, proEmail } = await buildBookingEmailPayload(
    meta,
    false,
  );

  if (proEmail && process.env.BREVO_API_KEY) {
    await sendBookingNotificationPro({
      ...bookingPayload,
      proEmail,
    }).catch((err) => console.error("[persist-booking] email pro", err));
  }
}
