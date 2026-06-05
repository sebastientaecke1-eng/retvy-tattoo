"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchDashboardPath } from "@/lib/auth";
import { createClientOrNull } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  clearOnboardingStoredSession,
  isStripeOnboardingReturnUrl,
  restoreSessionFromOnboardingStorage,
} from "@/lib/supabase/onboarding-session";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function Header() {
  const { theme } = useAppPreferences();
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardPath, setDashboardPath] = useState<
    "/pro/dashboard" | "/client/dashboard" | null
  >(null);

  const applyLoggedOut = useCallback(() => {
    setIsLoggedIn(false);
    setDashboardPath(null);
    setAuthReady(true);
  }, []);

  const refreshAuthUi = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase) {
      applyLoggedOut();
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      applyLoggedOut();
      return;
    }

    setIsLoggedIn(true);
    const path = await fetchDashboardPath();
    setDashboardPath(path ?? "/client/dashboard");
    setAuthReady(true);
  }, [applyLoggedOut]);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    void (async () => {
      const {
        data: { session: cookieSession },
      } = await supabase.auth.getSession();

      if (cookieSession?.access_token) {
        await refreshAuthUi();
        return;
      }

      if (isStripeOnboardingReturnUrl()) {
        const restored = await restoreSessionFromOnboardingStorage();
        if (restored?.access_token) {
          await refreshAuthUi();
          return;
        }
      }

      applyLoggedOut();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearOnboardingStoredSession();
        applyLoggedOut();
        return;
      }

      void refreshAuthUi();
    });

    return () => subscription.unsubscribe();
  }, [applyLoggedOut, refreshAuthUi]);

  const shell =
    theme === "dark"
      ? "border-zinc-900/80 bg-black/80"
      : "border-zinc-200/80 bg-white/80";

  const showGuestNav = !authReady || !isLoggedIn;
  const isProUser = dashboardPath === "/pro/dashboard";
  const dashboardHref =
    dashboardPath === "/pro/dashboard" || dashboardPath === "/client/dashboard"
      ? dashboardPath
      : null;

  const guestLinks = (
    <>
      <Link
        href="/inscription-client"
        className="inline-flex rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400"
      >
        Client
      </Link>
      <Link
        href="/pro/inscription"
        className="inline-flex rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
      >
        Pro
      </Link>
    </>
  );

  const loggedInLinks = (
    <>
      {dashboardHref && (
        <Link
          href={dashboardHref}
          className="inline-flex rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
        >
          {isProUser ? "Dashboard pro" : "Mon espace"}
        </Link>
      )}
      <SignOutButton />
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${shell}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-amber-500">Ret</span>
          <span className="text-zinc-900 dark:text-zinc-100">vy</span>
        </Link>
        <div className="flex items-center gap-2">
          {showGuestNav ? guestLinks : loggedInLinks}
        </div>
      </div>
    </header>
  );
}
