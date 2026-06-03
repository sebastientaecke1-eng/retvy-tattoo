"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { createClientOrNull } from "@/lib/supabase/client";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function Header() {
  const { t, theme } = useAppPreferences();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) return;

    const sync = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(!!session);
      });
    };
    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const shell =
    theme === "dark"
      ? "border-zinc-900/80 bg-black/80"
      : "border-zinc-200/80 bg-white/80";

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${shell}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-amber-500">Ret</span>
          <span className="text-zinc-900 dark:text-zinc-100">vy</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
          <Link
            href="/#chat"
            className="transition-colors hover:text-amber-500 dark:hover:text-amber-400"
          >
            {t("nav.qualify")}
          </Link>
          <Link
            href="/ink/demo"
            className="transition-colors hover:text-amber-500 dark:hover:text-amber-400"
          >
            {t("nav.demoProfile")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <Link
              href="/parametres"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-amber-400"
              aria-label={t("nav.settings")}
              title={t("nav.settings")}
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/connexion"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-amber-600 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-amber-400"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/inscription-client"
            className="hidden rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400 sm:inline-flex"
          >
            {t("nav.client")}
          </Link>
          <Link
            href="/pro/inscription"
            className="hidden rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400 sm:inline-flex"
          >
            {t("nav.pro")}
          </Link>
        </div>
      </div>
    </header>
  );
}
