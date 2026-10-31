import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PricingSettingsForm } from "@/components/pro/pricing-settings-form";
import {
  DEFAULT_PRICING_SETTINGS,
  type PricingSettings,
} from "@/lib/pro/pricing-settings";
import { fetchProStyleOptions } from "@/lib/pro/tattoo-style-catalog";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardFinancePage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/finance");

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);

  const [{ data: row }, proStyles] = await Promise.all([
    admin
      .from("pro_pricing_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    profile ? fetchProStyleOptions(admin, profile.id) : Promise.resolve([]),
  ]);

  const initial: PricingSettings = row
    ? {
        size_small_min: row.size_small_min,
        size_small_max: row.size_small_max,
        size_medium_min: row.size_medium_min,
        size_medium_max: row.size_medium_max,
        size_large_min: row.size_large_min,
        size_large_max: row.size_large_max,
        color_enabled: row.color_enabled,
        color_type: row.color_type,
        color_amount: row.color_amount,
        style_multipliers: (row.style_multipliers as Record<string, number>) ?? {},
        flash_enabled: (row as Record<string, unknown>).flash_enabled as boolean ?? false,
        flash_price_min: (row as Record<string, unknown>).flash_price_min as number ?? DEFAULT_PRICING_SETTINGS.flash_price_min,
        flash_price_max: (row as Record<string, unknown>).flash_price_max as number ?? DEFAULT_PRICING_SETTINGS.flash_price_max,
      zone_multipliers: (row as Record<string, unknown>).zone_multipliers as Record<string, number> ?? {},
      }
    : DEFAULT_PRICING_SETTINGS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Finance & Tarification
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ces tarifs guident l&apos;IA pour estimer les prix aux clients.
        </p>
      </div>
      <PricingSettingsForm
        initial={initial}
        proStyles={proStyles}
        subscriptionTier={(profile?.subscription_tier ?? "free") as import("@/lib/stripe/plans").PlanTier}
      />
    </div>
  );
}
