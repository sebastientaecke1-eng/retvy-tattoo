import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProDashboardNav } from "@/components/pro/pro-dashboard-nav";
import { getStudioProfiles } from "@/lib/pro/studio";
import { getActiveProfileId } from "@/lib/pro/active-profile";
import type { PlanTier } from "@/lib/stripe/plans";
import { getMaxArtists } from "@/lib/stripe/plans";
import { headers } from "next/headers";

export default async function ProDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  // Charge tous les profils du studio
  const allProfiles = await getStudioProfiles(admin, user.id);

  // Profil principal (non sous-profil)
  const mainProfile = allProfiles.find((p) => !p.is_sub_profile);

  // Profil actif via cookie
  const activeProfileId = await getActiveProfileId();
  const activeProfile = activeProfileId
    ? allProfiles.find((p) => p.id === activeProfileId) ?? mainProfile
    : mainProfile;

  // Tier du plan
  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status, is_sub_profile, status")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const raw = subData?.subscription_status ?? "";
  const tier: PlanTier = raw.includes("3plus") ? "3plus" : raw.includes("23") ? "23" : "1";
  const isStudio = tier !== "1";
  const subscriptionStatus = subData?.status ?? "active";

  // Bloquer les pages non-paramètres si abonnement résilié
  if (subscriptionStatus === "canceled" || subscriptionStatus === "canceling") {
    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? hdrs.get("next-url") ?? "";
    const isParamsPage = pathname.includes("/parametres");
    if (!isParamsPage) {
      redirect("/pro/dashboard/parametres");
    }
  }
  const maxArtists = getMaxArtists(tier);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl gap-0 px-4 py-8 md:gap-8">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 pr-6 dark:border-zinc-900 md:flex">
        <p className="text-xs uppercase tracking-widest text-blue-500/80">
          Espace pro
        </p>
        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
          {activeProfile?.artist_name ?? "Mon studio"}
        </p>
        <ProDashboardNav
          profiles={allProfiles}
          activeProfileId={activeProfile?.id ?? null}
          isStudio={isStudio}
          subscriptionStatus={subscriptionStatus}
          maxArtists={maxArtists}
        />
        <div className="mt-auto pt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-end gap-2 md:hidden">
          <Link
            href="/pro/dashboard/parametres"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#0057FF] dark:text-zinc-400 dark:hover:bg-zinc-900"
            aria-label="Paramètres"
            title="Paramètres"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <SignOutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
