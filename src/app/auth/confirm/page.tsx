"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClientOrNull } from "@/lib/supabase/client";

const REDIRECT_SECONDS = 3;
const DEFAULT_NEXT = "/client/dashboard";

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return next;
}

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = safeNext(searchParams.get("next"));
  const success = !error;

  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const [checkingSession, setCheckingSession] = useState(success);

  useEffect(() => {
    if (!success) return;

    const supabase = createClientOrNull();
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingSession(false);
      if (!session) {
        router.replace(`/connexion?next=${encodeURIComponent(next)}`);
      }
    });
  }, [success, next, router]);

  useEffect(() => {
    if (!success || checkingSession) return;

    if (seconds <= 0) {
      router.replace(next);
      router.refresh();
      return;
    }

    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, checkingSession, seconds, next, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Link href="/" className="text-sm text-zinc-500 hover:text-amber-400">
        ← Retvy
      </Link>

      <Card className="mt-8">
        <CardContent className="py-10 text-center">
          {success ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                {checkingSession ? (
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                ) : (
                  <Check className="h-8 w-8 text-emerald-400" />
                )}
              </div>
              <h1 className="mt-6 text-2xl font-bold text-zinc-50">
                Email confirmé !
              </h1>
              <p className="mt-3 text-zinc-400">
                Vous êtes maintenant connecté.
              </p>
              {!checkingSession && (
                <p className="mt-2 text-sm text-amber-400/90">
                  Redirection dans {seconds} seconde{seconds > 1 ? "s" : ""}…
                </p>
              )}
              <Button
                className="mt-8 w-full"
                onClick={() => {
                  router.replace(next);
                  router.refresh();
                }}
                disabled={checkingSession}
              >
                Accéder à mon espace
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="mt-6 text-2xl font-bold text-zinc-50">
                Confirmation impossible
              </h1>
              <p className="mt-3 text-sm text-red-300/90">{error}</p>
              <div className="mt-8 flex flex-col gap-2">
                <Link href="/connexion">
                  <Button variant="outline" className="w-full">
                    Se connecter
                  </Button>
                </Link>
                <Link href="/inscription-client">
                  <Button variant="ghost" className="w-full">
                    Créer un compte
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
