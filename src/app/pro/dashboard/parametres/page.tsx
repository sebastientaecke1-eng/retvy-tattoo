import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardSettingsPanel } from "@/components/settings/dashboard-settings-panel";
import { CancelSubscriptionSection } from "@/components/settings/cancel-subscription-section";
import type { PlanTier } from "@/lib/stripe/plans";

function getPlanLabel(tier: PlanTier, raw: string): string {
  const billing = raw.includes("annual") ? "Annuel" : "Mensuel";
  const tierLabel =
    tier === "3plus" ? "3+ tatoueurs" : tier === "23" ? "2–3 tatoueurs" : "1 tatoueur";
  return `${tierLabel} · ${billing}`;
}

export default async function ProDashboardParametresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let status = "active";
  let cancelAt: string | null = null;
  let planLabel = "Pro";

  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pro_profiles")
      .select("status, subscription_status, trial_ends_at")
      .eq("user_id", user.id)
      .eq("is_sub_profile", false)
      .maybeSingle();

    if (data) {
      status = data.status ?? "active";
      cancelAt = data.status === "canceling" ? (data.trial_ends_at ?? null) : null;
      const raw = data.subscription_status ?? "";
      const tier: PlanTier = raw.includes("3plus") ? "3plus" : raw.includes("23") ? "23" : "1";
      planLabel = getPlanLabel(tier, raw);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardSettingsPanel />
      <CancelSubscriptionSection
        status={status}
        cancelAt={cancelAt}
        planLabel={planLabel}
      />
    </div>
  );
}
