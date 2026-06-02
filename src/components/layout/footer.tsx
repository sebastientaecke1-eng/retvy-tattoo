"use client";

import Link from "next/link";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function Footer() {
  const { t } = useAppPreferences();

  return (
    <footer className="border-t border-zinc-200 py-12 dark:border-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-zinc-500">
          © {new Date().getFullYear()} Retvy — {t.footer.tagline}
        </p>
        <div className="flex gap-6 text-sm text-zinc-500">
          <Link
            href="/connexion"
            className="hover:text-amber-600 dark:hover:text-amber-400"
          >
            {t.footer.login}
          </Link>
          <Link
            href="/pro/inscription"
            className="hover:text-amber-600 dark:hover:text-amber-400"
          >
            {t.footer.becomePro}
          </Link>
        </div>
      </div>
    </footer>
  );
}
