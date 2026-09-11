"use client";

import { useState } from "react";
import { AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  status: string;
  cancelAt: string | null; // trial_ends_at used as cancel date when canceling
  planLabel: string;
}

export function CancelSubscriptionSection({ status, cancelAt, planLabel }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCanceling = status === "canceling";
  const isCanceled = status === "canceled";

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/subscription/cancel", { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur");
      setShowModal(false);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/subscription/reactivate", { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (isCanceled) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
            Abonnement
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Votre abonnement est résilié.</p>
          </div>
          <p className="text-sm text-zinc-500">
            Votre accès au dashboard est limité. Pour reprendre, souscrivez à un nouvel abonnement.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isCanceling && cancelAt) {
    return (
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Abonnement
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-start gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Résiliation planifiée</p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Votre accès reste actif jusqu&apos;au{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatDate(cancelAt)}
                </span>
                . Après cette date, toutes les fonctionnalités seront bloquées.
              </p>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? "En cours..." : "Réactiver l'abonnement"}
          </button>
        </CardContent>
      </Card>
    );
  }

  // Status actif
  return (
    <>
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0057FF]">
            Abonnement
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{planLabel}</p>
            <p className="mt-0.5 text-xs text-zinc-500">Abonnement actif</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-red-500 underline-offset-2 hover:underline"
          >
            Résilier l&apos;abonnement
          </button>
        </CardContent>
      </Card>

      {/* Modal de confirmation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Résilier l&apos;abonnement ?
                </h2>
                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                  Votre accès restera actif jusqu&apos;à la fin de la période en cours.
                  Après cette date, toutes les fonctionnalités (réservations, croquis, disponibilités)
                  seront bloquées.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                disabled={loading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {loading ? "En cours..." : "Confirmer la résiliation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
