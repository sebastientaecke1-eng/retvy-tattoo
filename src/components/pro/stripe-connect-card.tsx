"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STRIPE_DASHBOARD_URL = "https://dashboard.stripe.com";

type ConnectStatus = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  account_id: string | null;
};

type Props = {
  connectReturn?: string;
};

export function StripeConnectCard({ connectReturn }: Props) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshHandled = useRef(false);
  const successRefreshHandled = useRef(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/status", {
        credentials: "include",
      });
      const data = (await res.json()) as ConnectStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger le statut");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Impossible de démarrer l'onboarding");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (connectReturn !== "success" || successRefreshHandled.current) return;
    successRefreshHandled.current = true;
    void fetchStatus();
  }, [connectReturn, fetchStatus]);

  useEffect(() => {
    if (connectReturn !== "refresh" || refreshHandled.current) return;
    refreshHandled.current = true;
    void startOnboarding();
  }, [connectReturn, startOnboarding]);

  const isActive =
    !loading && status?.charges_enabled === true && Boolean(status.account_id);
  const needsConnect =
    !loading &&
    (status?.charges_enabled !== true || !status?.account_id);

  return (
    <Card className="border-zinc-800 bg-zinc-950/80">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Paiements Stripe
          </p>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification du compte…
            </p>
          ) : isActive ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
              )}
            >
              <Check className="h-4 w-4" />
              Compte Stripe connecté ✓
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                "border-red-500/40 bg-red-500/10 text-red-400",
              )}
            >
              Compte Stripe non connecté
            </span>
          )}
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
          {needsConnect ? (
            <p className="text-sm text-zinc-500">
              Connectez votre compte pour recevoir les acomptes de vos clients.
            </p>
          ) : null}
        </div>

        {loading ? null : isActive ? (
          <a
            href={STRIPE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button type="button" variant="outline" className="gap-2">
              Accéder à mon tableau de bord Stripe
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        ) : needsConnect ? (
          <Button
            type="button"
            onClick={() => void startOnboarding()}
            disabled={connecting}
            className="shrink-0"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirection…
              </>
            ) : (
              "Connecter mon compte Stripe"
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
