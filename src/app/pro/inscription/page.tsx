import { Suspense } from "react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/pro/onboarding-wizard";

export default function ProInscriptionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Inscription professionnel</h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        Compte, profil public, abonnement pro (30 jours offerts) et paiements
      </p>
      <p className="mt-4 text-center text-sm">
        <Link href="/connexion?next=/pro/inscription" className="text-amber-400 hover:underline">
          Déjà un compte ? Connectez-vous
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-center text-zinc-500">Chargement…</p>}>
          <OnboardingWizard />
        </Suspense>
      </div>
    </div>
  );
}
