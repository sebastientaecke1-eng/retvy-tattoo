import Link from "next/link";
import { redirect } from "next/navigation";
import { PersonalLinkSection } from "@/components/pro/personal-link-section";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardLienPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/lien");

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);

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

  if (!profile.slug) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-8 text-center">
        <h1 className="text-xl font-bold">Mon lien perso</h1>
        <p className="mt-2 text-zinc-400">
          Créez d&apos;abord votre slug dans votre profil pour obtenir votre
          lien public.
        </p>
        <Link href="/pro/dashboard/profil" className="mt-4 inline-block">
          <Button>Configurer mon profil</Button>
        </Link>
      </div>
    );
  }

  const studioSlug = (profile as Record<string, unknown>).studio_slug as string | null | undefined;

  return (
    <PersonalLinkSection
      slug={profile.slug}
      studioSlug={studioSlug ?? undefined}
    />
  );
}
