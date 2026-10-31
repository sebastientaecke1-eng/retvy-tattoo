import { redirect } from "next/navigation";
import { LargeProjectsSection } from "@/components/pro/large-projects-section";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function GrandsProjetsPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/grands-projets");
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);
  const tier = ((profile as Record<string, unknown>)?.subscription_tier ?? "free") as PlanTier;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Grands projets</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tatouages complexes multi-séances : suivez la progression session par session.
        </p>
      </div>
      <LargeProjectsSection subscriptionTier={tier} />
    </div>
  );
}
