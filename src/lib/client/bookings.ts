import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingStatus } from "@/lib/pro/bookings";
import type { Database } from "@/lib/database.types";

export type ClientBooking = Booking & {
  artist_name: string;
  artist_slug: string;
};

/** RDV annulable : futur (instant UTC) et non annulé — tout statut (pending, confirmed, …). */
export function canClientCancelBooking(booking: {
  status: string;
  booking_date: string;
}): boolean {
  if (String(booking.status).toLowerCase() === "cancelled") return false;
  const bookingMs = new Date(booking.booking_date).getTime();
  if (Number.isNaN(bookingMs)) return false;
  return bookingMs > Date.now();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function fetchClientBookings(
  admin: SupabaseClient<Database>,
  clientEmail: string,
  clientUserId?: string | null,
): Promise<ClientBooking[]> {
  const email = normalizeEmail(clientEmail);
  if (!email && !clientUserId) return [];

  console.log("[fetchClientBookings] recherche", {
    email,
    clientUserId: clientUserId ?? null,
  });

  const statuses: BookingStatus[] = ["pending", "confirmed", "cancelled"];
  const rowMap = new Map<string, Booking>();

  if (email) {
    const { data: byEmail, error: emailError } = await admin
      .from("bookings")
      .select("*")
      .ilike("client_email", email)
      .in("status", statuses)
      .order("booking_date", { ascending: true });

    if (emailError) {
      console.error("[fetchClientBookings] by email", emailError.message);
    } else {
      console.log("[fetchClientBookings] par email", {
        count: byEmail?.length ?? 0,
        emails: byEmail?.map((r) => r.client_email),
      });
      for (const row of byEmail ?? []) {
        rowMap.set(row.id, row as Booking);
      }
    }
  }

  if (clientUserId) {
    const { data: byId, error: idError } = await admin
      .from("bookings")
      .select("*")
      .eq("client_id", clientUserId)
      .in("status", statuses)
      .order("booking_date", { ascending: true });

    if (idError) {
      console.error("[fetchClientBookings] by client_id", idError.message);
    } else {
      console.log("[fetchClientBookings] par client_id", {
        count: byId?.length ?? 0,
      });
      for (const row of byId ?? []) {
        rowMap.set(row.id, row as Booking);
      }
    }
  }

  const rows = [...rowMap.values()].sort(
    (a, b) =>
      new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime(),
  );

  if (!rows.length) {
    console.log("[fetchClientBookings] aucun résultat");
    return [];
  }

  const proUserIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles, error: profileError } = await admin
    .from("pro_profiles")
    .select("user_id, artist_name, slug")
    .in("user_id", proUserIds);

  if (profileError) {
    console.error("[fetchClientBookings] profils", profileError.message);
  }

  const profileByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, p]),
  );

  const result = rows.map((row) => {
    const profile = profileByUser.get(row.user_id);
    return {
      ...row,
      artist_name: profile?.artist_name ?? "Tatoueur",
      artist_slug: profile?.slug ?? "",
    };
  });

  console.log("[fetchClientBookings] résultat final", {
    count: result.length,
    ids: result.map((b) => b.id),
  });

  return result;
}
