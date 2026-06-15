"use client";

import { useState, type ReactNode } from "react";
import { createClientOrNull } from "@/lib/supabase/client";
import { clearOnboardingStoredSession } from "@/lib/supabase/onboarding-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  label?: string;
  className?: string;
  icon?: ReactNode;
};

export function SignOutButton({
  label = "Déconnexion",
  className,
  icon,
}: SignOutButtonProps) {
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
      className={cn(icon && "gap-2", className)}
      onClick={() => void handleSignOut()}
      disabled={loading}
    >
      {icon}
      {loading ? "Déconnexion…" : label}
    </Button>
  );
}
