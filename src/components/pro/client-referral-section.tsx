"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import { Heart, Save, CheckCircle, Info, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientReferralConfig {
  enabled: boolean;
  rewardFor: "referrer" | "new_client" | "both";
  referrerReward: string;
  newClientReward: string;
}

const DEFAULT_CONFIG: ClientReferralConfig = {
  enabled: false,
  rewardFor: "both",
  referrerReward: "",
  newClientReward: "",
};

const REWARD_FOR_OPTIONS: { value: ClientReferralConfig["rewardFor"]; label: string; desc: string }[] = [
  { value: "referrer",   label: "Le parrain uniquement",   desc: "Seul le client qui recommande est récompensé" },
  { value: "new_client", label: "Le filleul uniquement",   desc: "Seul le nouveau client bénéficie d'un avantage" },
  { value: "both",       label: "Les deux",                desc: "Le parrain et le filleul sont tous les deux récompensés" },
];

export function ClientReferralSection({ subscriptionTier = "free" }: { subscriptionTier?: PlanTier }) {
  const canUse = hasFeature(subscriptionTier, "hasClientReferral");

  const [config, setConfig] = useState<ClientReferralConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState({ total: 0, booked: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pro/client-referral/config");
      if (res.ok) {
        const data = await res.json() as { config: ClientReferralConfig; stats: { total: number; booked: number } };
        setConfig(data.config);
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUse) { setLoading(false); return; }
    void load();
  }, [canUse, load]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/pro/client-referral/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json() as { error?: string };
        setSaveError(d.error ?? "Erreur lors de la sauvegarde");
      }
    } catch {
      setSaveError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-5 w-5 text-zinc-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Parrainage clients</h2>
          <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-400">Pro</span>
        </div>
        <p className="text-xs text-zinc-500">
          Disponible avec le plan Pro (27 EUR/mois). Vos clients satisfaits recommandent vos services
          à leurs proches — vous définissez la récompense, l&apos;IA génère un code unique pour chaque client.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">

      {/* En-tête + toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Parrainage clients</h2>
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
              config.enabled ? "bg-[#0057FF]" : "bg-zinc-700"
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
              config.enabled ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          <p className="text-xs text-zinc-500">Parrainages</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.booked}</p>
          <p className="text-xs text-zinc-500">Convertis</p>
        </div>
      </div>

      {/* Explication */}
      <div className="flex gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2.5">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400">
          Chaque client qui réserve avec vous reçoit un code unique à partager.
          Quand un ami s&apos;inscrit avec ce code, le parrainage est tracé automatiquement.
          Vous gérez les récompenses manuellement selon vos conditions.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-zinc-800" />)}
        </div>
      ) : (
        <>
          {/* Qui reçoit la récompense */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Qui est récompensé ?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {REWARD_FOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, rewardFor: opt.value }))}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                    config.rewardFor === opt.value
                      ? "border-blue-500/60 bg-blue-950/30 text-blue-300"
                      : "border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-zinc-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Récompense parrain */}
          {(config.rewardFor === "referrer" || config.rewardFor === "both") && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Users className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Ce que gagne le parrain
              </p>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex : 1 heure offerte sur sa prochaine séance"
                value={config.referrerReward}
                onChange={(e) => setConfig((c) => ({ ...c, referrerReward: e.target.value }))}
              />
            </div>
          )}

          {/* Récompense nouveau client */}
          {(config.rewardFor === "new_client" || config.rewardFor === "both") && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Heart className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Ce que gagne le nouveau client
              </p>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ex : 10% de réduction sur votre premier RDV"
                value={config.newClientReward}
                onChange={(e) => setConfig((c) => ({ ...c, newClientReward: e.target.value }))}
              />
            </div>
          )}

          {/* Bouton save */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={saving}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />Enregistré
              </span>
            )}
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          </div>
        </>
      )}
    </div>
  );
}
