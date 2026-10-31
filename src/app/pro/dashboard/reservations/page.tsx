import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchProBlockedDates, fetchProBookings, fetchProBlockedSlots } from "@/lib/pro/bookings";
import { ReservationsPage } from "@/components/pro/reservations-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardReservationsPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/reservations");

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Aucun profil pro trouvé.</p>
        <Link href="/pro/inscription" className="mt-4 inline-block">
          <Button>Commencer l&apos;inscription</Button>
        </Link>
      </div>
    );
  }

  const [bookings, blockedDates, blockedSlots] = await Promise.all([
    fetchProBookings(admin, profile.user_id, profile.id, profile.slug),
    fetchProBlockedDates(admin, profile.user_id),
    fetchProBlockedSlots(admin, profile.user_id),
  ]);

  const subscriptionTier = (profile.subscription_tier ?? "free") as import("@/lib/stripe/plans").PlanTier;

  return (
    <ReservationsPage
      initialBookings={bookings}
      blockedDates={blockedDates}
      blockedSlots={blockedSlots}
      subscriptionTier={subscriptionTier}
    />
  );
}
