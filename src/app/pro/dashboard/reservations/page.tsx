import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import type { Booking } from "@/lib/pro/bookings";
import { ReservationsPage } from "@/components/pro/reservations-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function ProDashboardReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/reservations");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Aucun profil pro trouvé.</p>
        <Link href="/pro/inscription" className="mt-4 inline-block">
          <Button>Commencer l&apos;inscription</Button>
        </Link>
      </div>
    );
  }

  const { data: rows, error } = await admin
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("booking_date", { ascending: true });

  if (error) {
    console.error("[reservations] bookings", error.message);
  }

  return <ReservationsPage initialBookings={(rows ?? []) as Booking[]} />;
}
