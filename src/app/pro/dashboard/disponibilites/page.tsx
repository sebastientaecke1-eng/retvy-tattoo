import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import { AvailabilitiesForm } from "@/components/pro/availabilities-form";
import {
  fetchProStyleOptions,
} from "@/lib/pro/tattoo-style-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { resolveActiveProfile } from "@/lib/pro/active-profile";

export default async function ProDashboardDisponibilitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/disponibilites");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const profile = await resolveActiveProfile(admin, user.id);

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

  const [schedulesRes, blockedRes, durationsRes, proStyles] =
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
      fetchProStyleOptions(admin, profile.id),
    ]);

  return (
    <AvailabilitiesForm
      initialSchedules={schedulesRes.data ?? []}
      initialBlocked={blockedRes.data ?? []}
      initialDurations={durationsRes.data ?? []}
      proStyles={proStyles}
    />
  );
}
