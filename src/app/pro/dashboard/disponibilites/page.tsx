import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import { AvailabilitiesForm } from "@/components/pro/availabilities-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("styles")
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

  const [schedulesRes, blockedRes, durationsRes] = await Promise.all([
    admin
      .from("pro_schedules")
      .select("day_of_week, start_time, end_time")
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    admin
      .from("pro_blocked_dates")
      .select("blocked_date")
      .eq("user_id", user.id)
      .order("blocked_date"),
    admin
      .from("pro_style_durations")
      .select(
        "style, size_category, duration_min_minutes, duration_max_minutes, duration_minutes",
      )
      .eq("user_id", user.id),
  ]);

  return (
    <AvailabilitiesForm
      initialSchedules={schedulesRes.data ?? []}
      initialBlocked={blockedRes.data ?? []}
      initialDurations={durationsRes.data ?? []}
      profileStyles={profile.styles ?? []}
    />
  );
}
