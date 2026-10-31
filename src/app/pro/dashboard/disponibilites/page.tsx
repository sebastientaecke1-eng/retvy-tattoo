import Link from "next/link";
import { redirect } from "next/navigation";
import { AvailabilitiesForm } from "@/components/pro/availabilities-form";
import {
  fetchProStyleDurationTargets,
} from "@/lib/pro/tattoo-style-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardDisponibilitesPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/disponibilites");

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

  // Récupérer le lock 24H + données dispo en parallèle
  const [schedulesRes, blockedRes, durationsRes, proStyles, proProfileRes] =
    await Promise.all([
      admin
        .from("pro_schedules")
        .select("day_of_week, start_time, end_time")
        .eq("profile_id", profile.id)
        .order("day_of_week")
        .order("start_time"),
      admin
        .from("pro_blocked_dates")
        .select("blocked_date")
        .eq("profile_id", profile.id)
        .order("blocked_date"),
      admin
        .from("pro_style_durations")
        .select(
          "style, size_category, duration_min_minutes, duration_max_minutes, duration_minutes",
        )
        .eq("profile_id", profile.id),
      fetchProStyleDurationTargets(admin, profile.id),
      admin
        .from("pro_profiles")
        .select("cancellation_24h_lock, subscription_tier")
        .eq("user_id", user.id)
        .eq("is_sub_profile", false)
        .maybeSingle(),
    ]);

  const cancellation24hLock = proProfileRes.data?.cancellation_24h_lock ?? false;
  const subscriptionTier = (proProfileRes.data?.subscription_tier ?? "free") as import("@/lib/stripe/plans").PlanTier;

  return (
    <div className="space-y-6">
      <AvailabilitiesForm
        initialSchedules={schedulesRes.data ?? []}
        initialBlocked={blockedRes.data ?? []}
        initialDurations={durationsRes.data ?? []}
        proStyles={proStyles}
        subscriptionTier={subscriptionTier}
        initialCancellation24hLock={cancellation24hLock}
      />
    </div>
  );
}
