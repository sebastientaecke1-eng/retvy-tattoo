import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, User } from "lucide-react";

export default async function ProDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard");

  const { data: proRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "pro")
    .maybeSingle();

  const { data: profile } = await supabase
    .from("pro_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proRole && !profile) {
    redirect("/pro/inscription");
  }

  const subOk = ["trialing", "active"].includes(
    profile?.subscription_status ?? "",
  );

  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard pro</h1>
      <p className="text-zinc-500">
        Bonjour, {profile?.artist_name ?? user.email}
      </p>

      {!profile && (
        <Card className="mt-8">
          <CardContent className="py-8 text-center">
            <p className="text-zinc-400">Finalisez votre inscription pro.</p>
            <Link href="/pro/inscription" className="mt-4 inline-block">
              <Button>Continuer</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {profile && (
        <>
          {!subOk && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              Abonnement en attente ({profile.subscription_status ?? "non activé"}
              ).{" "}
              <Link href="/pro/inscription" className="underline">
                Activer l&apos;offre pro
              </Link>
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex gap-4 pt-6">
                <Calendar className="h-8 w-8 shrink-0 text-amber-400" />
                <div>
                  <h2 className="font-medium">Réservations</h2>
                  <p className="mt-1 text-2xl font-bold text-amber-400">0</p>
                  <p className="text-xs text-zinc-500">Module à venir</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex gap-4 pt-6">
                <User className="h-8 w-8 shrink-0 text-amber-400" />
                <div>
                  <h2 className="font-medium">Profil</h2>
                  <p className="mt-1 text-sm text-zinc-400">{profile.city}</p>
                  <p className="text-sm text-zinc-500">
                    {profile.styles?.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Statut : {profile.status}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex gap-4 pt-6">
                <CreditCard className="h-8 w-8 shrink-0 text-amber-400" />
                <div>
                  <h2 className="font-medium">Stripe Connect</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {profile.stripe_connect_account_id
                      ? "Connecté"
                      : "Non configuré"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {profile.slug && (
            <Card className="mt-6">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <p className="text-sm text-zinc-500">Page publique</p>
                  <p className="font-mono text-amber-400">/ink/{profile.slug}</p>
                </div>
                <Link href={`/ink/${profile.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    Voir le profil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
