import { redirect } from "next/navigation";
import { SketchesBookingList } from "@/components/pro/sketches-booking-list";
import { userHasProAccess } from "@/lib/auth";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProDashboardCroquisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/croquis");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: true });

  const { data: sketches } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("pro_user_id", user.id);

  const sketchesByBookingId = Object.fromEntries(
    (sketches ?? []).map((s) => [s.booking_id, s as BookingSketch]),
  );

  return (
    <SketchesBookingList
      bookings={(bookings ?? []) as Booking[]}
      sketchesByBookingId={sketchesByBookingId}
    />
  );
}
