import { redirect } from "next/navigation";
import { SketchesBookingList } from "@/components/pro/sketches-booking-list";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardCroquisPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/croquis");

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);

  // Récupération des réservations isolées par profil
  // Nouvelles réservations : filtrées via pro_profile_id
  // Anciennes réservations (pro_profile_id null) : filtrées via artist_slug (unique par artiste dans un studio)
  let bookingsQuery = admin
    .from("bookings")
    .select("*")
    .neq("status", "cancelled")
    .order("booking_date", { ascending: true });

  if (profile) {
    if (profile.slug) {
      bookingsQuery = bookingsQuery.or(
        `pro_profile_id.eq.${profile.id},and(pro_profile_id.is.null,artist_slug.eq.${profile.slug})`
      ) as typeof bookingsQuery;
    } else {
      bookingsQuery = bookingsQuery.or(
        `pro_profile_id.eq.${profile.id},and(pro_profile_id.is.null,user_id.eq.${user.id})`
      ) as typeof bookingsQuery;
    }
  } else {
    bookingsQuery = bookingsQuery.eq("user_id", user.id);
  }

  const { data: bookings } = await bookingsQuery;

  // Récupération des croquis : filtrés via les booking_id des réservations ci-dessus
  // (bookings_sketches n'a pas de pro_profile_id, donc on passe par les IDs de réservations)
  const bookingIds = (bookings ?? []).map((b) => b.id);

  let sketches: BookingSketch[] = [];
  if (bookingIds.length > 0) {
    const { data: sketchData } = await admin
      .from("bookings_sketches")
      .select("*")
      .in("booking_id", bookingIds);
    sketches = (sketchData ?? []) as BookingSketch[];
  }

  const sketchesByBookingId = Object.fromEntries(
    sketches.map((s) => [s.booking_id, s]),
  );

  return (
    <SketchesBookingList
      bookings={(bookings ?? []) as Booking[]}
      sketchesByBookingId={sketchesByBookingId}
    />
  );
}
