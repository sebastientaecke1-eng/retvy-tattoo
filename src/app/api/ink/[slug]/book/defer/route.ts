import { NextResponse } from "next/server";
import {
  bookingMetadataFromPrepared,
  prepareInkBooking,
} from "@/lib/pro/prepare-ink-booking";
import { fulfillPendingBooking } from "@/lib/pro/persist-booking";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

/** Réservation sans paiement immédiat — notifie le pro. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const rawBody = (await request.json()) as Record<string, unknown>;
    const sessionUser = await resolveRequestUser(request);
    if (sessionUser) {
      rawBody.client_id = sessionUser.id;
      if (
        typeof rawBody.client_email !== "string" ||
        !rawBody.client_email.trim()
      ) {
        rawBody.client_email = sessionUser.email ?? rawBody.client_email;
      }
    }
    console.log("[book/defer] enregistrement", {
      slug,
      client_email: rawBody.client_email,
      client_id: rawBody.client_id,
    });

    const result = await prepareInkBooking(slug, rawBody);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const meta = bookingMetadataFromPrepared(result.data);
    console.log("[book/defer] insertion + emails", {
      client_email: meta.client_email,
      pro_user_id: meta.pro_user_id,
      reference: meta.reference,
    });

    await fulfillPendingBooking(
      {
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
        budget: meta.budget,
        duration_minutes: meta.duration_minutes,
        deposit_eur: meta.deposit_eur,
        client_user_id: meta.client_user_id,
        client_email: meta.client_email,
        client_name: meta.client_name,
        client_phone: meta.client_phone,
        reference: meta.reference,
        cancellation_policy: meta.cancellation_policy,
        reference_image_url: meta.reference_image_url,
        color_preference: meta.color_preference,
      },
      { logPrefix: "[book/defer]" },
    );

    return NextResponse.json({
      ok: true,
      reference: result.data.reference,
      message:
        "Votre RDV est réservé. Le tatoueur a été notifié. Pensez à régler l'acompte avant votre RDV.",
    });
  } catch (error) {
    console.error("[api/ink/book/defer] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Impossible d'enregistrer la réservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
