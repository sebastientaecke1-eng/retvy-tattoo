import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { cookies } from "next/headers";
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

const ADMIN_EMAIL = "sebastientaecke1@gmail.com";

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

  // Vérifier si on est en mode "voir comme pro"
  const cookieStore = await cookies();
  const isAdminViewingAsPro =
    user.email === ADMIN_EMAIL &&
    cookieStore.get("retvy_view_as_pro")?.value === "true";

  // Paralléliser les requêtes indépendantes pour réduire la latence
  const [hasAccess, allProfiles, activeProfileId] = await Promise.all([
    userHasProAccess(admin, user.id),
    getStudioProfiles(admin, user.id),
    getActiveProfileId(),
  ]);

  if (!hasAccess) {
    redirect("/client/dashboard");
  }

  // Profil principal (non sous-profil)
  const mainProfile = allProfiles.find((p) => !p.is_sub_profile);

  // Profil actif via cookie
  const activeProfile = activeProfileId
    ? allProfiles.find((p) => p.id === activeProfileId) ?? mainProfile
    : mainProfile;

  // Données subscription depuis le profil principal déjà chargé (pas de requête supplémentaire)
  const subData = mainProfile ?? null;

  const tier: PlanTier = (subData?.subscription_tier as PlanTier | null | undefined) ?? "free";
  const isStudio = tier !== "free" && tier !== "starter";
  const subscriptionStatus = subData?.status ?? "pending_payment";

  // Rediriger vers inscription si abonnement pas encore souscrit (sauf admin en mode test)
  if (subscriptionStatus === "pending_payment" && !isAdminViewingAsPro) {
    redirect("/pro/inscription");
  }

  // Bloquer les pages non-paramètres si abonnement définitivement résilié
  if (subscriptionStatus === "canceled") {
    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? hdrs.get("next-url") ?? "";
    const isParamsPage = pathname.includes("/parametres");
    if (!isParamsPage) {
      redirect("/pro/dashboard/parametres");
    }
  }
  const maxArtists = getMaxArtists(tier);

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen">
      {/* Barre admin mode test */}
      {isAdminViewingAsPro && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950">
          <span>⚡ Mode test — vue tatoueur</span>
          <a
            href="/api/admin/view-as-pro?action=exit"
            className="rounded-full bg-amber-950/20 px-3 py-1 text-xs font-bold hover:bg-amber-950/30 transition-colors"
          >
            ← Retour admin
          </a>
        </div>
      )}
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
    </div>
  );
}
