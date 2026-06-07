"use client";

import { useState } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { clearOnboardingStoredSession } from "@/lib/supabase/onboarding-session";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClientOrNull();

  async function handleSignOut() {
    setLoading(true);
    clearOnboardingStoredSession();
    try {
      if (supabase) {
        void supabase.auth.signOut();
      }
    } catch {
      // ignore l'erreur
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void handleSignOut()}
      disabled={loading}
    >
      {loading ? "Déconnexion…" : "Déconnexion"}
    </Button>
  );
}
