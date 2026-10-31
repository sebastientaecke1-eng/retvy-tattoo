import Link from "next/link";
import { redirect } from "next/navigation";
import { DepositSettingsForm } from "@/components/pro/deposit-settings-form";
import { StripeConnectCard } from "@/components/pro/stripe-connect-card";
import {
  DEFAULT_DEPOSIT_SETTINGS,
  parseRulesFromDb,
  type DepositSettings,
} from "@/lib/pro/deposit-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { getUserCached, getUserProAccessCached, getActiveProfileCached } from "@/lib/supabase/request-cache";

export default async function ProDashboardAcomptePage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const params = await searchParams;
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/acompte");

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

  const { data: row } = await admin
    .from("pro_deposit_settings")
    .select("deposit_enabled, deposit_type, cancellation_policy, rules")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const initial: DepositSettings = row
    ? {
        deposit_enabled: row.deposit_enabled ?? true,
        deposit_type: row.deposit_type === "percent" ? "percent" : "fixed",
        cancellation_policy:
          row.cancellation_policy as DepositSettings["cancellation_policy"],
        rules: parseRulesFromDb(row.rules),
      }
    : DEFAULT_DEPOSIT_SETTINGS;

  return (
    <div className="space-y-6">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Connexion paiement</p>
      <StripeConnectCard connectReturn={params.connect} />
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Règles d&apos;acompte</p>
      <DepositSettingsForm initial={initial} />
    </div>
  );
}
