import { Suspense } from "react";
import { ConnexionPageShell } from "@/components/auth/connexion-page-shell";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-md px-4 py-16 text-zinc-500">…</p>}>
      <ConnexionPageShell />
    </Suspense>
  );
}
