import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioProfiles } from "@/lib/pro/studio";
import { getActiveProfileId } from "@/lib/pro/active-profile";
import type { PlanTier } from "@/lib/stripe/plans";
import { getUserCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const params = await searchParams;

  if (params.connect === "success" || params.connect === "refresh") {
    redirect(`/pro/dashboard/acompte?connect=${params.connect}`);
  }

  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard");

  const admin = createAdminClient();

  // Tier depuis le profil déjà chargé — pas de requête séparée
  const profiles = await getStudioProfiles(admin, user.id);
  const mainProfile = profiles.find((p) => !p.is_sub_profile);
  const raw = mainProfile?.subscription_status ?? "";
  const tier: PlanTier = raw.includes("premium")
    ? "premium"
    : raw.includes("pro")
    ? "pro"
    : raw.includes("starter")
    ? "starter"
    : "free";

  // Plan multi-artistes : rediriger vers sélecteur si pas de profil actif en cookie
  if (tier !== "free") {
    if (profiles.length > 1) {
      const activeId = await getActiveProfileId();
      const isValid = activeId && profiles.some((p) => p.id === activeId);
      if (!isValid) {
        redirect("/pro/choisir-profil");
      }
    }
  }

  redirect("/pro/dashboard/reservations");
}
