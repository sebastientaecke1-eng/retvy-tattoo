import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function ConnexionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-amber-400">
        ← Retvy
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Connexion</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Client ou professionnel — redirection automatique selon votre rôle.
      </p>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Chargement…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
