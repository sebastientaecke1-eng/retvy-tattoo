import { redirect } from "next/navigation";
import { ReferralSection } from "@/components/pro/referral-section";
import { ClientReferralSection } from "@/components/pro/client-referral-section";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ParrainagePage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/parrainage");
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profile = await getActiveProfileCached(user.id);
  const tier = ((profile as Record<string, unknown>)?.subscription_tier ?? "free") as PlanTier;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Parrainage artistes</p>

      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Parrainage</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Invitez d&apos;autres tatoueurs et gagnez des avantages sur votre abonnement.
        </p>
        <div className="mt-4">
          <ReferralSection subscriptionTier={tier} />
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Fidélisation clients</p>

      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Parrainage clients</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Vos clients peuvent recommander vos services à leurs proches.
          Définissez ici les récompenses que vous offrez.
        </p>
        <div className="mt-4">
          <ClientReferralSection subscriptionTier={tier} />
        </div>
      </div>
    </div>
  );
}
