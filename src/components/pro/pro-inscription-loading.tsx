"use client";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function ProInscriptionLoading() {
  const { t } = useAppPreferences();
  return (
    <p className="text-center text-zinc-600 dark:text-zinc-500">
      {t.signupPro.loading}
    </p>
  );
}
