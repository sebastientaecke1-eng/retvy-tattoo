import { Suspense } from "react";
import { ConnexionPageShell } from "@/components/auth/connexion-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ConnexionLoading } from "@/components/auth/connexion-loading";

export default function ConnexionPage() {
  return (
    <ConnexionPageShell>
      <Suspense fallback={<ConnexionLoading />}>
        <LoginForm />
      </Suspense>
    </ConnexionPageShell>
  );
}
