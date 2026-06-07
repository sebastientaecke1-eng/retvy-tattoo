"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchDashboardPath } from "@/lib/auth";
import { createClientOrNull } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  clearOnboardingStoredSession,
  isStripeOnboardingReturnUrl,
  restoreSessionFromOnboardingStorage,
} from "@/lib/supabase/onboarding-session";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

type DashboardPath = "/pro/dashboard" | "/client/dashboard";

export function Header() {
  const pathname = usePathname();
  const { theme } = useAppPreferences();
  const mounted = useRef(false);
  const authReadyRef = useRef(false);
  const allowSessionRestore = useRef(true);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardPath, setDashboardPath] = useState<DashboardPath | null>(
    null,
  );

  const applyLoggedOut = useCallback(() => {
    setIsLoggedIn(false);
    setDashboardPath(null);
    authReadyRef.current = true;
    setAuthReady(true);
  }, []);

  const applyLoggedIn = useCallback(async (sessionToken: string) => {
    setIsLoggedIn(true);
    authReadyRef.current = true;
    setAuthReady(true);

    try {
      const res = await fetch("/api/me/dashboard-path", {
        credentials: "include",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { path?: string };
        if (
          data.path === "/pro/dashboard" ||
          data.path === "/client/dashboard"
        ) {
          setDashboardPath(data.path);
          return;
        }
      }
    } catch {
      /* repli ci-dessous */
    }

    const path = await fetchDashboardPath();
    setDashboardPath(path ?? "/client/dashboard");
  }, []);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) {
      authReadyRef.current = true;
      setAuthReady(true);
      return;
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await applyLoggedIn(session.access_token);
        mounted.current = true;
        return;
      }

      if (isStripeOnboardingReturnUrl()) {
        const restored = await restoreSessionFromOnboardingStorage();
        if (restored?.access_token) {
          await applyLoggedIn(restored.access_token);
          mounted.current = true;
          return;
        }
      }

      applyLoggedOut();
      mounted.current = true;
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        allowSessionRestore.current = false;
        clearOnboardingStoredSession();
        mounted.current = true;
        applyLoggedOut();
        return;
      }

      if (session?.access_token) {
        allowSessionRestore.current = true;
        void applyLoggedIn(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [applyLoggedIn, applyLoggedOut]);

  useEffect(() => {
    if (!mounted.current || !allowSessionRestore.current) return;

    const supabase = createClientOrNull();
    if (!supabase) return;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await applyLoggedIn(session.access_token);
      }
    })();
  }, [pathname, applyLoggedIn]);

  useEffect(() => {
    const fallback = window.setTimeout(() => {
      if (authReadyRef.current) return;
      mounted.current = true;
      applyLoggedOut();
    }, 2000);

    return () => clearTimeout(fallback);
  }, [applyLoggedOut]);

  const showGuestNav = authReady && !isLoggedIn;
  const showLoggedInNav = authReady && isLoggedIn;

  const shell =
    theme === "dark"
      ? "border-zinc-900/80 bg-black/80"
      : "border-zinc-200/80 bg-white/80";

  const isProUser = dashboardPath === "/pro/dashboard";
  const resolvedDashboardPath: DashboardPath =
    dashboardPath ?? "/client/dashboard";

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
          {!authReady ? (
            <div
              className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800/60"
              aria-hidden
            />
          ) : null}
          {showLoggedInNav ? (
            <>
              <Link
                href={resolvedDashboardPath}
                className="inline-flex rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
              >
                {isProUser ? "Dashboard pro" : "Mon espace"}
              </Link>
              <SignOutButton />
            </>
          ) : null}
          {showGuestNav ? (
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
          ) : null}
        </div>
      </div>
    </header>
  );
}
