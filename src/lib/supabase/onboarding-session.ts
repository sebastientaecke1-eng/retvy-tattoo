import type { Session } from "@supabase/supabase-js";
import { createClientOrNull } from "./client";

export const ONBOARDING_SESSION_KEY = "retvy:pro-onboarding:session";

type StoredSession = {
  access_token: string;
  refresh_token: string;
};

export function readOnboardingStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Rétablit les cookies Supabase après retour Stripe (sessionStorage). */
export async function restoreSessionFromOnboardingStorage(): Promise<Session | null> {
  const supabase = createClientOrNull();
  if (!supabase) return null;

  const {
    data: { session: existing },
  } = await supabase.auth.getSession();
  if (existing?.access_token) return existing;

  const stored = readOnboardingStoredSession();
  if (!stored) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  });

  if (error) {
    console.warn("[auth] restoreSessionFromOnboardingStorage:", error.message);
    return null;
  }

  return data.session;
}

/** Retour Stripe onboarding : restauration sessionStorage autorisée. */
export function isStripeOnboardingReturnUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("sub") === "ok" || params.get("connect") === "done";
}

export function clearOnboardingStoredSession(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
