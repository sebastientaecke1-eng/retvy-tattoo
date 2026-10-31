import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardSettingsPanel } from "@/components/settings/dashboard-settings-panel";
import { CancelSubscriptionSection } from "@/components/settings/cancel-subscription-section";
import type { PlanTier } from "@/lib/stripe/plans";
import { getUserCached } from "@/lib/supabase/request-cache";

function getPlanLabel(tier: PlanTier, raw: string): string {
  const billing = raw.includes("annual") ? "Annuel" : "Mensuel";
  const tierLabel =
    tier === "premium" ? "Premium" : tier === "pro" ? "Pro" : tier === "starter" ? "Starter" : "Gratuit";
  return `${tierLabel} · ${billing}`;
}

export default async function ProDashboardParametresPage() {
  const user = await getUserCached();

  let status = "active";
  let cancelAt: string | null = null;
  let planLabel = "Pro";
  let currentTier: PlanTier = "free";

  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pro_profiles")
      .select("status, subscription_status, subscription_tier, trial_ends_at")
      .eq("user_id", user.id)
      .eq("is_sub_profile", false)
      .maybeSingle();

    if (data) {
      status = data.status ?? "active";
      cancelAt = data.status === "canceling" ? (data.trial_ends_at ?? null) : null;
      const raw = data.subscription_status ?? "";
      const tier: PlanTier =
        (data.subscription_tier as PlanTier) ??
        (raw.includes("premium") ? "premium" : raw.includes("pro") ? "pro" : raw.includes("starter") ? "starter" : "free");
      currentTier = tier;
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
        currentTier={currentTier}
        userId={user?.id ?? ""}
        userEmail={user?.email ?? ""}
      />
    </div>
  );
}
