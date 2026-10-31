"use client";

import { useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { PricingZonesSection } from "@/components/pro/pricing-zones-section";
import type { PlanTier } from "@/lib/stripe/plans";
import { Button } from "@/components/ui/button";
import type { PricingSettings } from "@/lib/pro/pricing-settings";
import type { ProStyleOption } from "@/lib/pro/tattoo-style-catalog";

interface Props {
  initial: PricingSettings;
  proStyles: ProStyleOption[];
  subscriptionTier?: PlanTier;
}

export function PricingSettingsForm({ initial, proStyles, subscriptionTier = "free" }: Props) {
  const [settings, setSettings] = useState<PricingSettings>(() => {
    const multipliers: Record<string, number> = {};
    for (const s of proStyles) {
      multipliers[s.slug] = initial.style_multipliers[s.slug] ?? 1.0;
    }
    return { ...initial, style_multipliers: multipliers, zone_multipliers: initial.zone_multipliers ?? {} };
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof PricingSettings>(key: K, value: PricingSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function setMultiplier(style: string, value: number) {
    setSettings((s) => ({
      ...s,
      style_multipliers: { ...s.style_multipliers, [style]: value },
    }));
    setSaved(false);
  }

  // Preview calculation
  const previewSizes = {
    small: { min: settings.size_small_min, max: settings.size_small_max, label: "Petit (< 10 cm)" },
    medium: { min: settings.size_medium_min, max: settings.size_medium_max, label: "Moyen (10–25 cm)" },
    large: { min: settings.size_large_min, max: settings.size_large_max, label: "Grand (> 25 cm)" },
  };
  const [previewSize, setPreviewSize] = useState<keyof typeof previewSizes>("medium");
  const [previewStyle, setPreviewStyle] = useState(() => proStyles[0]?.slug ?? "");
  const [previewColor, setPreviewColor] = useState(true);

  function computePreview() {
    const p = previewSizes[previewSize];
    const styleMult = settings.style_multipliers[previewStyle] ?? 1.0;
    let colorFactor = 1;
    let fixedAdd = 0;
    if (settings.color_enabled && previewColor) {
      if (settings.color_type === "pct") {
        colorFactor = 1 + settings.color_amount / 100;
      } else {
        fixedAdd = settings.color_amount;
      }
    }
    return {
      min: Math.round(p.min * styleMult * colorFactor) + fixedAdd,
      max: Math.round(p.max * styleMult * colorFactor) + fixedAdd,
      detail: `Base ${p.min}–${p.max} € × ${styleMult} (style)${
        settings.color_enabled && previewColor
          ? settings.color_type === "pct"
            ? ` × ${colorFactor.toFixed(2)} (couleur +${settings.color_amount}%)`
            : ` + ${settings.color_amount} € (couleur)`
          : ""
      }`,
    };
  }
  const preview = computePreview();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pro/pricing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la sauvegarde");
      } else {
        setSaved(true);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Tarification de base ── */}
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Tarification de base</p>

      {/* Tarifs par taille */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tarifs par taille</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Fourchette de prix min / max selon la taille</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Petit", sub: "Moins de 10 cm", minKey: "size_small_min" as const, maxKey: "size_small_max" as const },
            { label: "Moyen", sub: "10 à 25 cm", minKey: "size_medium_min" as const, maxKey: "size_medium_max" as const },
            { label: "Grand", sub: "Plus de 25 cm", minKey: "size_large_min" as const, maxKey: "size_large_max" as const },
          ].map(({ label, sub, minKey, maxKey }) => (
            <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
              <p className="text-xs text-zinc-400">{sub}</p>
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Min</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      value={settings[minKey]}
                      onChange={(e) => setField(minKey, Number(e.target.value))}
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-2 pr-6 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">€</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Max</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      value={settings[maxKey]}
                      onChange={(e) => setField(maxKey, Number(e.target.value))}
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-2 pr-6 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">€</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact couleur */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Impact couleur</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Majoration appliquée si le client veut de la couleur</p>
        <div className="mt-4 space-y-4">
          {/* Toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.color_enabled}
              onClick={() => setField("color_enabled", !settings.color_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.color_enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.color_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Activer la majoration couleur
            </span>
          </label>

          {settings.color_enabled && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Type selector */}
              <div className="flex overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                {(["pct", "fixed"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("color_type", t)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      settings.color_type === t
                        ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-950 dark:text-blue-400"
                        : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    } ${t === "fixed" ? "border-l border-zinc-200 dark:border-zinc-700" : ""}`}
                  >
                    {t === "pct" ? "Pourcentage (%)" : "Montant fixe (€)"}
                  </button>
                ))}
              </div>
              {/* Amount */}
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span>Majoration de</span>
                <div className="relative w-20">
                  <input
                    type="number"
                    min={0}
                    value={settings.color_amount}
                    onChange={(e) => setField("color_amount", Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-2 pr-6 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    {settings.color_type === "pct" ? "%" : "€"}
                  </span>
                </div>
                <span>sur le tarif de base</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tarifs Flash */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Zap className="h-4 w-4 text-blue-400" />
          Tarifs Flash
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Les tatouages flash sont des designs pré-dessinés vendus à prix fixe, indépendamment de la taille.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.flash_enabled}
              onClick={() => setField("flash_enabled", !settings.flash_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.flash_enabled ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.flash_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Proposer des tatouages flash
            </span>
          </label>

          {settings.flash_enabled && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="mb-3 text-xs font-medium text-blue-700 dark:text-blue-400">
                Fourchette de prix pour vos flash
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Min</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      value={settings.flash_price_min}
                      onChange={(e) => setField("flash_price_min", Number(e.target.value))}
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-2 pr-6 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">€</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Max</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      value={settings.flash_price_max}
                      onChange={(e) => setField("flash_price_max", Number(e.target.value))}
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-2 pr-6 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">€</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                Ce tarif sera communiqué au client quand il demande un tatouage flash, sans calcul selon la taille.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Ajustements ── */}
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Ajustements</p>

      {/* Coefficients par style */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Coefficient par style</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ajuste le tarif selon la technique — 1.0 = pas de changement
        </p>
        {proStyles.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            Aucun style configuré — ajoutez-en depuis{" "}
            <a href="/pro/dashboard/disponibilites" className="text-blue-500 underline">
              Disponibilités
            </a>.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {proStyles.map(({ slug, label }) => (
              <div
                key={slug}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                <div className="relative ml-2 w-16 flex-shrink-0">
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    max={3}
                    value={settings.style_multipliers[slug] ?? 1.0}
                    onChange={(e) => setMultiplier(slug, Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-2 pr-5 text-right text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prix par zone du corps */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Prix par zone du corps</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ajustez vos estimations selon la zone tatouée</p>
        <div className="mt-4">
          <PricingZonesSection
            value={settings.zone_multipliers ?? {}}
            onChange={(v) => setField("zone_multipliers", v)}
            subscriptionTier={subscriptionTier}
          />
        </div>
      </div>

      {/* ── Estimation IA ── */}
      <p className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Estimation IA</p>

      {/* Aperçu */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Aperçu estimation</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Simulez ce que verra le client</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={previewSize}
            onChange={(e) => setPreviewSize(e.target.value as keyof typeof previewSizes)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {Object.entries(previewSizes).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={previewStyle}
            onChange={(e) => setPreviewStyle(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {proStyles.map(({ slug, label }) => (
              <option key={slug} value={slug}>{label}</option>
            ))}
          </select>
          <select
            value={previewColor ? "1" : "0"}
            onChange={(e) => setPreviewColor(e.target.value === "1")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="0">Noir & gris</option>
            <option value="1">Avec couleurs</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Estimation affichée au client</p>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{preview.detail}</p>
          </div>
          <span className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {preview.min} – {preview.max} €
          </span>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-700 dark:text-blue-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Tarifs enregistrés
        </p>
      )}

      <div className="flex justify-end pb-8">
        <Button type="button" size="lg" disabled={saving} onClick={handleSave}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer les tarifs"
          )}
        </Button>
      </div>
    </div>
  );
}
