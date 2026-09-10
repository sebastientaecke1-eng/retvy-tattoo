"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClientOrNull } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) { setReady(true); return; }

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (tokenHash && type === "recovery") {
      // Vérifier le token côté client pour établir la session
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (error) {
          setError("Lien invalide ou expiré. Demandez une nouvelle réinitialisation.");
        }
        setReady(true);
      });
      return;
    }

    // Fallback : si on arrive sans token (session déjà active via onAuthStateChange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClientOrNull();
    if (!supabase) {
      setError("Configuration manquante.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError("Une erreur est survenue, réessayez.");
      setLoading(false);
      return;
    }

    router.push("/connexion?reset=1");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Link href="/connexion" className="text-sm text-zinc-500 hover:text-blue-400">
        ← Connexion
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nouveau mot de passe
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Choisissez un nouveau mot de passe pour votre compte.
      </p>

      <Card className="mt-8">
        <CardHeader />
        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}
              {!error && (
                <>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                      Nouveau mot de passe
                    </label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                      Confirmer le mot de passe
                    </label>
                    <PasswordInput
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
                  </Button>
                </>
              )}
              {error && (
                <Link href="/auth/reset-password">
                  <Button type="button" variant="outline" className="w-full mt-2">
                    Demander un nouveau lien
                  </Button>
                </Link>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
