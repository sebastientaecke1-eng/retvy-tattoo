"use client";

import { useEffect } from "react";

/**
 * Détecte le hash Supabase #access_token=...&type=recovery
 * et redirige vers /auth/update-password avec les tokens.
 */
export function AuthRecoveryHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    try {
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (type === "recovery" && accessToken && refreshToken) {
        const dest = new URL("/auth/update-password", window.location.origin);
        dest.searchParams.set("access_token", accessToken);
        dest.searchParams.set("refresh_token", refreshToken);
        dest.searchParams.set("type", "recovery");
        // Redirection niveau navigateur — garanti de fonctionner
        window.location.replace(dest.toString());
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, []);

  return null;
}
