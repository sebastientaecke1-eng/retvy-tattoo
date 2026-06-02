"use client";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function ConnexionLoading() {
  const { t } = useAppPreferences();
  return <p className="mt-8 text-zinc-600 dark:text-zinc-500">{t.login.loading}</p>;
}
