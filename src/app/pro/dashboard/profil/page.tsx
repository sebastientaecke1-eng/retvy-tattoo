import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import { ProfileEditForm } from "@/components/pro/profile-edit-form";
import {
  fetchProStyleIds,
  fetchTattooStyleCatalogAdmin,
} from "@/lib/pro/tattoo-style-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { resolveActiveProfile } from "@/lib/pro/active-profile";

export default async function ProDashboardProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/profil");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) redirect("/client/dashboard");

  const profile = await resolveActiveProfile(admin, user.id);

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Aucun profil pro trouvé.</p>
        <Link href="/pro/inscription" className="mt-4 inline-block">
          <Button>Commencer l&apos;inscription</Button>
        </Link>
      </div>
    );
  }

  const [{ data: portfolio }, { data: studioPhotos }, styleCatalog, proStyleIds] =
    await Promise.all([
      admin
        .from("pro_portfolio")
        .select("id, style, image_url, position")
        .eq("profile_id", profile.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      admin
        .from("pro_studio_photos")
        .select("id, image_url")
        .eq("user_id", profile.user_id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      fetchTattooStyleCatalogAdmin(admin),
      fetchProStyleIds(admin, profile.id),
    ]);

  const tier = (profile as Record<string, unknown>).subscription_tier as string | null | undefined;
  const canUseStudio = tier === "23" || tier === "3plus";

  return (
    <ProfileEditForm
      initialProfile={profile}
      initialPortfolio={portfolio ?? []}
      initialStudioPhotos={studioPhotos ?? []}
      initialProStyleIds={proStyleIds}
      styleCatalog={styleCatalog}
      canUseStudio={canUseStudio}
    />
  );
}
