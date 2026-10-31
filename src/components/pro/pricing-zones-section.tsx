"use client";

import { useState } from "react";
import { Lock, MapPin, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanTier } from "@/lib/stripe/plans";

export const BODY_ZONES = [
  { id: "tête", label: "Tête / Crâne" },
  { id: "cou", label: "Cou" },
  { id: "nuque", label: "Nuque" },
  { id: "épaule", label: "Épaule" },
  { id: "bras", label: "Bras (complet)" },
  { id: "avant-bras", label: "Avant-bras" },
  { id: "poignet", label: "Poignet" },
  { id: "main", label: "Main / Doigt" },
  { id: "poitrine", label: "Poitrine" },
  { id: "côte", label: "Côte / Flanc" },
  { id: "ventre", label: "Ventre" },
  { id: "dos", label: "Dos (complet)" },
  { id: "haut du dos", label: "Haut du dos" },
  { id: "bas du dos", label: "Bas du dos" },
  { id: "fesse", label: "Fesse" },
  { id: "cuisse", label: "Cuisse" },
  { id: "genou", label: "Genou" },
  { id: "mollet", label: "Mollet" },
  { id: "cheville", label: "Cheville" },
  { id: "pied", label: "Pied / Orteil" },
];

type Props = {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  subscriptionTier: PlanTier;
};

function pctLabel(mult: number) {
  const diff = Math.round((mult - 1) * 100);
  if (diff === 0) return "×1.0 (neutre)";
  if (diff > 0) return `+${diff}%`;
  return `${diff}%`;
}

export function PricingZonesSection({ value, onChange, subscriptionTier }: Props) {
  const canUse = subscriptionTier === "pro" || subscriptionTier === "premium";
  const [custom, setCustom] = useState("");

  if (!canUse) {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
        <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Les <strong>multiplicateurs de prix par zone</strong> sont disponibles
          à partir du plan <strong>Pro</strong>. Ajustez automatiquement vos
          estimations selon la zone tatouée (ex: tête +30%, dos −10%).
        </p>
      </div>
    );
  }

  function setZone(id: string, mult: number) {
    if (mult === 1) {
      const next = { ...value };
      delete next[id];
      onChange(next);
    } else {
      onChange({ ...value, [id]: mult });
    }
  }

  function removeZone(id: string) {
    const next = { ...value };
    delete next[id];
    onChange(next);
  }

  function addCustomZone() {
    const z = custom.trim().toLowerCase();
    if (!z) return;
    onChange({ ...value, [z]: value[z] ?? 1.1 });
    setCustom("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Multiplicateurs par zone du corps
        </p>
        <span className="ml-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
          Pro+
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Zones neutres (×1.0) n&apos;apparaissent pas dans les estimations. Seules les zones avec un
        multiplicateur différent influencent le prix.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BODY_ZONES.map((zone) => {
          const mult = value[zone.id] ?? 1.0;
          const isActive = zone.id in value;
          return (
            <div
              key={zone.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                isActive
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300 w-32 shrink-0">
                {zone.label}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZone(zone.id, Math.max(0.5, Math.round((mult - 0.1) * 10) / 10))}
                  className="h-6 w-6 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className={`text-xs font-mono w-16 text-center ${isActive && mult !== 1 ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-zinc-400"}`}>
                  {pctLabel(mult)}
                </span>
                <button
                  type="button"
                  onClick={() => setZone(zone.id, Math.min(3.0, Math.round((mult + 0.1) * 10) / 10))}
                  className="h-6 w-6 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
                {isActive && mult !== 1 && (
                  <button
                    type="button"
                    onClick={() => removeZone(zone.id)}
                    className="text-zinc-300 hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-500 transition-colors ml-1"
                    title="Réinitialiser"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone personnalisée */}
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Zone personnalisée (ex: sternum)"
          className="h-8 text-sm"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomZone(); } }}
        />
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addCustomZone}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {/* Zones custom actives */}
      {Object.entries(value)
        .filter(([id]) => !BODY_ZONES.find(z => z.id === id))
        .map(([id, mult]) => (
          <div key={id} className="flex items-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{id}</span>
            <span className="text-xs font-mono text-blue-700 dark:text-blue-300 font-semibold">{pctLabel(mult)}</span>
            <button type="button" onClick={() => removeZone(id)} className="text-zinc-400 hover:text-red-400">×</button>
          </div>
        ))}
    </div>
  );
}
