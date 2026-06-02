"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createClientOrNull,
  getBrowserSupabaseEnvError,
} from "@/lib/supabase/client";
import { redirectPathForUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function LoginForm() {
  const { t } = useAppPreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(getBrowserSupabaseEnvError());

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClientOrNull();
    if (!supabase) {
      setError(getBrowserSupabaseEnvError());
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const path =
        next && next.startsWith("/")
          ? (next as "/pro/dashboard" | "/client/dashboard")
          : await redirectPathForUser(supabase, data.user.id);
      router.push(path);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <p className="text-sm text-zinc-600 dark:text-zinc-500">
          {t.login.cardHint}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              {t.login.email}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              {t.login.password}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.login.submitting : t.login.submit}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-500">
          {t.login.noAccount}{" "}
          <Link
            href="/inscription-client"
            className="text-amber-600 hover:underline dark:text-amber-400"
          >
            {t.login.client}
          </Link>
          {" · "}
          <Link
            href="/pro/inscription"
            className="text-amber-600 hover:underline dark:text-amber-400"
          >
            {t.login.pro}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
