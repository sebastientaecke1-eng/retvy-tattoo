"use client";

import Link from "next/link";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function ProInscriptionIntro() {
  const { t } = useAppPreferences();

  return (
    <>
      <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t.signupPro.title}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-500">
        {t.signupPro.subtitle}
      </p>
      <p className="mt-4 text-center text-sm">
        <Link
          href="/connexion?next=/pro/inscription"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          {t.signupPro.hasAccount}
        </Link>
      </p>
    </>
  );
}
