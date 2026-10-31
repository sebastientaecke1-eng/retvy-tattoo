"use client";

import { useState, useEffect } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import { Gift, Copy, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralSection({ subscriptionTier = "free" }: { subscriptionTier?: PlanTier }) {
  const [code, setCode] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<{ status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const canReferral = hasFeature(subscriptionTier, "hasReferral");

  useEffect(() => {
    if (!canReferral) { setLoading(false); return; }
    fetch("/api/pro/referral")
      .then((r) => r.json())
      .then((d) => { setCode(d.code); setLink(d.link); setReferrals(d.referrals ?? []); })
      .finally(() => setLoading(false));
  }, [canReferral]);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  if (!canReferral) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-5 w-5 text-zinc-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Parrainage</h2>
          <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-400">Premium</span>
        </div>
        <p className="text-xs text-zinc-500">
          Disponible avec le plan Premium (30 EUR/mois). Parrainez d autres tatoueurs et obtenez
          des avantages sur votre abonnement.
        </p>
      </div>
    );
  }

  const converted = referrals.filter((r) => r.status === "converted" || r.status === "rewarded").length;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-blue-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Parrainage</h2>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-100/40 dark:bg-zinc-800/40 p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{referrals.length}</p>
              <p className="text-xs text-zinc-500">Invites</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gray-100/40 dark:bg-zinc-800/40 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{converted}</p>
              <p className="text-xs text-zinc-500">Convertis</p>
            </div>
          </div>

          {/* Code */}
          <div>
            <p className="mb-1.5 text-xs text-zinc-500">Votre code parrain</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-4 py-2.5 text-center font-mono text-xl font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                {code ?? "..."}
              </div>
            </div>
          </div>

          {/* Lien */}
          <div>
            <p className="mb-1.5 text-xs text-zinc-500">Lien d invitation</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-400 font-mono">{link}</p>
              <Button type="button" size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-1.5">
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copie !" : "Copier"}
              </Button>
            </div>
          </div>

          {/* Liste filleuls */}
          {referrals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Users className="inline h-3 w-3 mr-1" />
                Filleuls ({referrals.length})
              </p>
              <div className="space-y-1.5">
                {referrals.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gray-100/30 dark:bg-zinc-800/30 px-3 py-1.5">
                    <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.status === "converted" || r.status === "rewarded" ? "bg-emerald-950/50 text-emerald-400" : "bg-gray-100 dark:bg-zinc-800 text-zinc-500"}`}>
                      {r.status === "converted" || r.status === "rewarded" ? "Converti" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-600">
            Chaque filleul converti en abonne actif vous rapporte 1 mois offert sur votre prochain renouvellement.
          </p>
        </>
      )}
    </div>
  );
}
