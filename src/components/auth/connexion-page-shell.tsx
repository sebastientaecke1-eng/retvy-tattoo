"use client";

import Link from "next/link";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function ConnexionPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useAppPreferences();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400"
      >
        {t.login.back}
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t.login.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
        {t.login.subtitle}
      </p>
      {children}
    </div>
  );
}
