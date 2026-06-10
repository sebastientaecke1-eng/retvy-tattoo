import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import { DepositSettingsForm } from "@/components/pro/deposit-settings-form";
import { StripeConnectCard } from "@/components/pro/stripe-connect-card";
import {
  DEFAULT_DEPOSIT_SETTINGS,
  parseRulesFromDb,
  type DepositSettings,
} from "@/lib/pro/deposit-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function ProDashboardAcomptePage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/acompte");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Aucun profil pro trouvé.</p>
        <Link href="/pro/inscription" className="mt-4 inline-block">
          <Button>Commencer l&apos;inscription</Button>
        </Link>
      </div>
    );
  }

  const { data: row } = await admin
    .from("pro_deposit_settings")
    .select("deposit_type, cancellation_policy, rules")
    .eq("user_id", user.id)
    .maybeSingle();

  const initial: DepositSettings = row
    ? {
        deposit_type: row.deposit_type === "percent" ? "percent" : "fixed",
        cancellation_policy:
          row.cancellation_policy as DepositSettings["cancellation_policy"],
        rules: parseRulesFromDb(row.rules),
      }
    : DEFAULT_DEPOSIT_SETTINGS;

  return (
    <div className="space-y-8">
      <StripeConnectCard connectReturn={params.connect} />
      <DepositSettingsForm initial={initial} />
    </div>
  );
}
