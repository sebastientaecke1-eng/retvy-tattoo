"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClientOrNull,
  getBrowserSupabaseEnvError,
} from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function InscriptionClientPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(getBrowserSupabaseEnvError());
  const [info, setInfo] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/client/dashboard");
    });
  }, [router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    setAccountExists(false);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError(getBrowserSupabaseEnvError());
      setLoading(false);
      return;
    }
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/client/dashboard`,
        data: { first_name: firstName, last_name: lastName },
      },
    });

    if (signError) {
      const msg = signError.message;
      if (/already registered/i.test(msg)) setAccountExists(true);
      else setError(msg);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/client/dashboard");
      router.refresh();
    } else {
      setInfo(
        "Compte créé ! Vérifiez votre boîte mail pour activer votre compte.",
      );
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-amber-400">
        ← Retvy
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Inscription client</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Suivez vos projets qualifiés par l&apos;IA et vos rendez-vous.
      </p>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Prénom</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Nom</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Mot de passe (8+ caractères)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {info && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {info}
              </p>
            )}
            {accountExists && (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Un compte existe déjà.{" "}
                <Link href="/connexion" className="underline">
                  Connectez-vous
                </Link>
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
            <p className="text-center text-sm text-zinc-500">
              <Link href="/connexion" className="text-amber-400 hover:underline">
                Déjà inscrit ?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
