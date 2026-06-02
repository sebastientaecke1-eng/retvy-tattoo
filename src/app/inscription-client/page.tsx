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
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export default function InscriptionClientPage() {
  const { t } = useAppPreferences();
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
      setInfo(t.signupClient.success);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400"
      >
        {t.signupClient.back}
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t.signupClient.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
        {t.signupClient.subtitle}
      </p>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  {t.signupClient.firstName}
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  {t.signupClient.lastName}
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                {t.signupClient.email}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                {t.signupClient.password}
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
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {t.signupClient.already}{" "}
                <Link href="/connexion" className="underline">
                  {t.signupClient.signIn}
                </Link>
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.signupClient.submitting : t.signupClient.submit}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-500">
              <Link
                href="/connexion"
                className="text-amber-600 hover:underline dark:text-amber-400"
              >
                {t.signupClient.alreadyRegistered}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
