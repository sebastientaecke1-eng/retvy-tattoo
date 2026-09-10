"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Détecte le hash Supabase #access_token=...&type=recovery
 * et redirige vers /auth/update-password avec les tokens.
 */
export function AuthRecoveryHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type === "recovery" && accessToken && refreshToken) {
      // Rediriger vers la page de changement de mot de passe
      // en passant les tokens en query params (la page les lira et appellera setSession)
      const dest = new URL("/auth/update-password", window.location.origin);
      dest.searchParams.set("access_token", accessToken);
      dest.searchParams.set("refresh_token", refreshToken);
      dest.searchParams.set("type", "recovery");
      router.replace(dest.toString());
    }
  }, [router]);

  return null;
}
