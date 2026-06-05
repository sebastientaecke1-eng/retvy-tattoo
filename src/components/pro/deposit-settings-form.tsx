"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import {
  CANCELLATION_OPTIONS,
  defaultDepositValueForTier,
  type DepositRule,
  type DepositSettings,
  type DepositType,
  type CancellationPolicy,
} from "@/lib/pro/deposit-settings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type RuleRow = DepositRule & { key: string };

function toRows(rules: DepositRule[]): RuleRow[] {
  return rules.map((r) => ({ ...r, key: crypto.randomUUID() }));
}

type Props = {
  initial: DepositSettings;
};

export function DepositSettingsForm({ initial }: Props) {
  const [depositType, setDepositType] = useState<DepositType>(initial.deposit_type);
  const [cancellation, setCancellation] = useState<CancellationPolicy>(
    initial.cancellation_policy,
  );
  const [rules, setRules] = useState<RuleRow[]>(() => toRows(initial.rules));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const valueLabel =
    depositType === "fixed" ? "Acompte (€)" : "Acompte (%)";
  const valuePlaceholder = depositType === "fixed" ? "€" : "%";

  function applyDepositValuesForType(
    rows: RuleRow[],
    type: DepositType,
  ): RuleRow[] {
    return rows.map((row, index) => ({
      ...row,
      deposit_value: defaultDepositValueForTier(type, index),
    }));
  }

  function changeDepositType(type: DepositType) {
    setDepositType(type);
    setRules((prev) => applyDepositValuesForType(prev, type));
  }

  function addRule() {
    const last = rules[rules.length - 1];
    const nextMin = last
      ? (last.price_max ?? last.price_min) + 1
      : 0;
    setRules((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        price_min: nextMin,
        price_max: null,
        deposit_value: defaultDepositValueForTier(depositType, rules.length),
      },
    ]);
  }

  function removeRule(key: string) {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRule(
    key: string,
    field: keyof DepositRule,
    value: number | null,
  ) {
    setRules((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      deposit_type: depositType,
      cancellation_policy: cancellation,
      rules: rules.map(({ price_min, price_max, deposit_value }) => ({
        price_min,
        price_max,
        deposit_value,
      })),
    };

    try {
      const res = await fetch("/api/pro/deposit-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec sauvegarde");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Acomptes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Montants demandés à la réservation et politique d&apos;annulation.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Des frais de service de 5&nbsp;% seront prélevés sur chaque acompte
          reçu via Retvy.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Paramètres enregistrés
        </p>
      )}

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Type d&apos;acompte
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 pt-0">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="deposit_type"
              checked={depositType === "fixed"}
              onChange={() => changeDepositType("fixed")}
              className="h-4 w-4 border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/30"
            />
            <span className="text-zinc-200">Montant fixe (€)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="deposit_type"
              checked={depositType === "percent"}
              onChange={() => changeDepositType("percent")}
              className="h-4 w-4 border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/30"
            />
            <span className="text-zinc-200">Pourcentage (%)</span>
          </label>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
              Règles par tranche de prix
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Prix total du projet (€) → {valueLabel.toLowerCase()}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4" />
            Ajouter une tranche
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-3 pr-4 font-medium">Min (€)</th>
                <th className="pb-3 pr-4 font-medium">Max (€)</th>
                <th className="pb-3 pr-4 font-medium">{valueLabel}</th>
                <th className="pb-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.key} className="border-b border-zinc-800/60">
                  <td className="py-3 pr-4">
                    <Input
                      type="number"
                      min={0}
                      value={rule.price_min}
                      onChange={(e) =>
                        updateRule(
                          rule.key,
                          "price_min",
                          Number(e.target.value) || 0,
                        )
                      }
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Input
                      type="number"
                      min={0}
                      placeholder="300+"
                      value={rule.price_max ?? ""}
                      onChange={(e) =>
                        updateRule(
                          rule.key,
                          "price_max",
                          e.target.value === ""
                            ? null
                            : Number(e.target.value) || 0,
                        )
                      }
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Input
                      type="number"
                      min={0}
                      max={depositType === "percent" ? 100 : undefined}
                      step={1}
                      placeholder={valuePlaceholder}
                      value={rule.deposit_value}
                      onChange={(e) =>
                        updateRule(
                          rule.key,
                          "deposit_value",
                          Number(e.target.value) || 0,
                        )
                      }
                      className="w-28"
                    />
                  </td>
                  <td className="py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={rules.length <= 1}
                      onClick={() => removeRule(rule.key)}
                      aria-label="Supprimer la tranche"
                    >
                      <Trash2 className="h-4 w-4 text-zinc-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-600">
            Laissez Max vide pour une tranche sans plafond (ex. 300€+).
          </p>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Politique d&apos;annulation
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {CANCELLATION_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800/80 px-4 py-3 hover:border-zinc-700"
            >
              <input
                type="radio"
                name="cancellation"
                checked={cancellation === opt.id}
                onChange={() => setCancellation(opt.id)}
                className="mt-0.5 h-4 w-4 border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500/30"
              />
              <span className="text-sm text-zinc-300">{opt.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer les acomptes"
          )}
        </Button>
      </div>
    </form>
  );
}
