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
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export default function InscriptionClientPage() {
  const router = useRouter();
  const { t } = useAppPreferences();
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

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "client",
        email,
        password,
        firstName,
        lastName,
        next: "/client/dashboard",
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      code?: string;
      emailSent?: boolean;
      message?: string;
    };

    if (!res.ok) {
      const msg = data.error ?? "";
      if (
        data.code === "already_registered" ||
        /already registered/i.test(msg)
      ) {
        setAccountExists(true);
      } else {
        setError(msg || "Inscription échouée");
      }
      setLoading(false);
      return;
    }

    if (data.emailSent) {
      setInfo(data.message ?? t("signup.emailConfirm"));
      setLoading(false);
      return;
    }

    const supabase = createClientOrNull();
    if (supabase) {
      const { data: signInData, error: signInErr } =
        await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr && signInData.session) {
        router.push("/client/dashboard");
        router.refresh();
        setLoading(false);
        return;
      }
    }

    setInfo(t("signup.emailConfirm"));
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400"
      >
        {t("signup.back")}
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("signup.title")}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
        {t("signup.subtitle")}
      </p>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  {t("signup.firstName")}
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  {t("signup.lastName")}
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
                {t("signup.email")}
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
                {t("signup.password")}
              </label>
              <PasswordInput
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
              <p className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
                {t("signup.accountExists")}{" "}
                <Link href="/connexion" className="underline">
                  {t("signup.signIn")}
                </Link>
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("signup.submitting") : t("signup.submit")}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-500">
              <Link
                href="/connexion"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("signup.already")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
