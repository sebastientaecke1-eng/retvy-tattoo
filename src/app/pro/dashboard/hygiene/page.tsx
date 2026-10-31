import { redirect } from "next/navigation";
import { HygieneSection } from "@/components/pro/hygiene-section";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ProDashboardHygienePage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/hygiene");
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);
  const tier = ((profile as Record<string, unknown>)?.subscription_tier ?? "free") as PlanTier;
  const stampEnabled = (profile as Record<string, unknown>)?.hygiene_stamp_enabled === true;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 min-h-screen dark:bg-zinc-950">
      <h1 className="text-xl font-bold text-zinc-100">Hygiene & Conformite</h1>
      <HygieneSection
        initialStampEnabled={stampEnabled}
        subscriptionTier={tier}
      />
    </div>
  );
}
