"use client";

import { useRouter } from "next/navigation";
import { createClientOrNull } from "@/lib/supabase/client";
import { clearOnboardingStoredSession } from "@/lib/supabase/onboarding-session";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    clearOnboardingStoredSession();

    const supabase = createClientOrNull();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      Déconnexion
    </Button>
  );
}
