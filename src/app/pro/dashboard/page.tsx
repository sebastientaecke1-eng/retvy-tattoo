import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioProfiles } from "@/lib/pro/studio";
import { getActiveProfileId } from "@/lib/pro/active-profile";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ProDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const params = await searchParams;

  if (params.connect === "success" || params.connect === "refresh") {
    redirect(`/pro/dashboard/acompte?connect=${params.connect}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard");

  const admin = createAdminClient();

  // Tier du plan
  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const raw = subData?.subscription_status ?? "";
  const tier: PlanTier = raw.includes("3plus")
    ? "3plus"
    : raw.includes("23")
    ? "23"
    : "1";

  // Plan multi-artistes : rediriger vers sélecteur si pas de profil actif en cookie
  if (tier !== "1") {
    const profiles = await getStudioProfiles(admin, user.id);
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
