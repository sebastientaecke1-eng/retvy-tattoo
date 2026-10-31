"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Plus, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { ProHygieneRecordRow, HygieneCategory } from "@/lib/database.types";

const CATEGORIES: { id: HygieneCategory; label: string; color: string }[] = [
  { id: "formation", label: "Formation", color: "text-blue-400 bg-blue-950/40 border-blue-800/50" },
  { id: "autoclave", label: "Autoclave", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" },
  { id: "desinfection", label: "Desinfection", color: "text-blue-400 bg-blue-950/40 border-blue-800/50" },
  { id: "materiel", label: "Materiel", color: "text-amber-400 bg-amber-950/40 border-amber-800/50" },
  { id: "autre", label: "Autre", color: "text-zinc-400 bg-zinc-800/60 border-zinc-700" },
];

function statusOf(record: ProHygieneRecordRow): "ok" | "expiring" | "expired" {
  if (!record.expires_at) return "ok";
  const exp = new Date(record.expires_at);
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / 86400000;
  if (diff < 0) return "expired";
  if (diff < 30) return "expiring";
  return "ok";
}

export function HygieneSection({
  initialStampEnabled = false,
  subscriptionTier = "free",
}: {
  initialStampEnabled?: boolean;
  subscriptionTier?: PlanTier;
}) {
  const [records, setRecords] = useState<ProHygieneRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stampEnabled, setStampEnabled] = useState(initialStampEnabled);
  const [stampSaving, setStampSaving] = useState(false);

  // Formulaire ajout
  const [category, setCategory] = useState<HygieneCategory>("formation");
  const [label, setLabel] = useState("");
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canHygiene = hasFeature(subscriptionTier, "hasHygieneTracking");
  const canStamp = hasFeature(subscriptionTier, "hasStamp");

  const load = useCallback(async () => {
    if (!canHygiene) { setLoading(false); return; }
    try {
      const res = await fetch("/api/pro/hygiene");
      const json = await res.json();
      setRecords(json.records ?? []);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, [canHygiene]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!label.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/pro/hygiene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label: label.trim(), completed_at: completedAt, expires_at: expiresAt || null, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRecords((prev) => [json.record, ...prev]);
      setLabel("");
      setExpiresAt("");
      setNotes("");
      setShowForm(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/pro/hygiene?id=${id}`, { method: "DELETE" });
  }

  async function toggleStamp() {
    setStampSaving(true);
    const next = !stampEnabled;
    setStampEnabled(next);
    await fetch("/api/pro/hygiene/stamp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setStampSaving(false);
  }

  if (!canHygiene) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-zinc-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Suivi hygiene</h2>
          <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-400">Starter+</span>
        </div>
        <p className="text-xs text-zinc-500">
          Disponible a partir du plan Starter (22 EUR/mois). Suivez vos formations hygiene,
          cycles autoclave et conformite materiel.
        </p>
      </div>
    );
  }

  const expired = records.filter((r) => statusOf(r) === "expired");
  const expiring = records.filter((r) => statusOf(r) === "expiring");

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Suivi hygiene</h2>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {/* Alertes */}
      {expired.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {expired.length} enregistrement{expired.length > 1 ? "s" : ""} expire{expired.length > 1 ? "s" : ""}
        </div>
      )}
      {expiring.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          <Clock className="h-4 w-4 shrink-0" />
          {expiring.length} enregistrement{expiring.length > 1 ? "s" : ""} expire{expiring.length > 1 ? "nt" : ""} dans moins de 30 jours
        </div>
      )}

      {/* Formulaire ajout */}
      {showForm && (
        <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${category === cat.id ? cat.color : "border-zinc-700 text-zinc-500 bg-transparent"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Libelle (ex: Formation RABC, Autoclave cycle 134 C...)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Date realisation</label>
              <Input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Expiration (optionnel)</label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <Input
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd} disabled={adding || !label.trim()}>
              {adding ? "Ajout..." : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-800" />)}
        </div>
      ) : records.length === 0 ? (
        <p className="text-center text-xs text-zinc-600 py-4">Aucun enregistrement. Ajoutez votre premiere entree hygiene.</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const cat = CATEGORIES.find((c) => c.id === r.category);
            const st = statusOf(r);
            return (
              <div key={r.id} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-3 py-2.5">
                <div className="mt-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat?.color ?? "border-zinc-700 text-zinc-500"}`}>
                      {cat?.label ?? r.category}
                    </span>
                    {st === "expired" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                    {st === "expiring" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                    {st === "ok" && r.expires_at && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-200 truncate">{r.label}</p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(r.completed_at).toLocaleDateString("fr-FR")}
                    {r.expires_at && ` · exp. ${new Date(r.expires_at).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                <button type="button" onClick={() => handleDelete(r.id)} className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors mt-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Badge hygiène public (Premium) */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-zinc-300">Badge hygiene public</p>
              {!canStamp && (
                <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-400">Premium</span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {canStamp
                ? "Affiche un badge de conformite visible sur votre profil public."
                : "Disponible avec le plan Premium (30 EUR/mois). Affichez un tampon de conformite hygiene sur votre profil."}
            </p>
          </div>
          {canStamp && (
            <button
              type="button"
              onClick={toggleStamp}
              disabled={stampSaving}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${stampEnabled ? "bg-[#0057FF]" : "bg-zinc-700"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${stampEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
