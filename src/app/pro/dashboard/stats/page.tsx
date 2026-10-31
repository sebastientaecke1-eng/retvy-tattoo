import { redirect } from "next/navigation";
import { StatsPage } from "@/components/pro/stats-page";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ProDashboardStatsPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/stats");
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);
  const tier = ((profile as Record<string, unknown>)?.subscription_tier ?? "free") as PlanTier;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <StatsPage subscriptionTier={tier} />
    </div>
  );
}
