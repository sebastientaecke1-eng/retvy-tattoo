"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Loader2, Lock, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PlanTier } from "@/lib/stripe/plans";

type BlockedSlot = {
  id: string;
  slot_date: string;
  time_from: string;
  time_to: string;
  reason: string | null;
};

type Props = {
  subscriptionTier: PlanTier;
};

const DAYS_FR = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

function formatSlotDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

export function BlockTimeSlotSection({ subscriptionTier }: Props) {
  const canUse = subscriptionTier !== "free";

  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Champs du formulaire
  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("11:00");
  const [reason, setReason] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurUntil, setRecurUntil] = useState("");

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pro/availabilities/block-slot");
      if (res.ok) {
        const json = await res.json() as { slots: BlockedSlot[] };
        setSlots(json.slots ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canUse) loadSlots();
  }, [canUse, loadSlots]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!date) { setError("Veuillez choisir une date."); return; }
    if (timeFrom >= timeTo) { setError("L'heure de début doit être avant l'heure de fin."); return; }
    if (isRecurring && !recurUntil) { setError("Veuillez indiquer la date de fin de récurrence."); return; }
    if (isRecurring && recurUntil < date) { setError("La date de fin de récurrence doit être après la date de début."); return; }

    setSaving(true);
    try {
      const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
      const body = {
        slot_date: date,
        time_from: timeFrom,
        time_to: timeTo,
        reason: reason || undefined,
        is_recurring: isRecurring,
        recur_until: isRecurring ? recurUntil : undefined,
        recur_day_of_week: isRecurring ? dayOfWeek : undefined,
      };

      const res = await fetch("/api/pro/availabilities/block-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Erreur lors de l'enregistrement.");
        return;
      }

      const j = await res.json() as { count: number };
      const msg = isRecurring && j.count > 1
        ? `${j.count} créneaux bloqués (chaque ${DAYS_FR[new Date(`${date}T12:00:00Z`).getUTCDay()]} jusqu'au ${formatSlotDate(recurUntil)})`
        : "Créneau bloqué avec succès.";
      setSuccess(msg);

      // Reset form
      setDate("");
      setTimeFrom("09:00");
      setTimeTo("11:00");
      setReason("");
      setIsRecurring(false);
      setRecurUntil("");

      await loadSlots();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pro/availabilities/block-slot?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSlots(prev => prev.filter(s => s.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  // ── Gate plan ──
  if (!canUse) {
    return (
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Bloquer des heures précises
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
            <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Cette fonctionnalité est disponible à partir du plan{" "}
              <strong>Starter</strong>. Vous pouvez bloquer des plages horaires
              précises dans votre journée, avec option de récurrence hebdomadaire.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grouper les slots par date pour l'affichage
  const grouped: Record<string, BlockedSlot[]> = {};
  for (const s of slots) {
    if (!grouped[s.slot_date]) grouped[s.slot_date] = [];
    grouped[s.slot_date].push(s);
  }

  const today = new Date().toISOString().split("T")[0];
  const futureDates = Object.keys(grouped).filter(d => d >= today).sort();
  const pastDates = Object.keys(grouped).filter(d => d < today).sort().reverse().slice(0, 5);

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Clock className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Bloquer des heures précises
        </h3>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Formulaire */}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Date
              </label>
              <Input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                De
              </label>
              <Input
                type="time"
                value={timeFrom}
                onChange={e => setTimeFrom(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                À
              </label>
              <Input
                type="time"
                value={timeTo}
                onChange={e => setTimeTo(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
          </div>

          <Input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Raison (optionnel) — ex: Réunion, Rendez-vous médical…"
            className="h-9 text-sm"
          />

          {/* Récurrence */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 accent-blue-600"
              />
              <Repeat className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Récurrence hebdomadaire (même jour de la semaine)
              </span>
            </label>
            {isRecurring && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-xs text-zinc-500">Jusqu&apos;au</span>
                <Input
                  type="date"
                  value={recurUntil}
                  min={date || today}
                  onChange={e => setRecurUntil(e.target.value)}
                  className="h-8 text-sm w-44"
                  required={isRecurring}
                />
                {date && recurUntil && recurUntil > date && (
                  <span className="text-xs text-zinc-400">
                    (chaque {DAYS_FR[new Date(`${date}T12:00:00Z`).getUTCDay()]})
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {saving ? "Enregistrement…" : "Bloquer ce créneau"}
          </Button>
        </form>

        {/* Liste des créneaux */}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement…
          </div>
        ) : (
          <>
            {futureDates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Créneaux bloqués à venir
                </p>
                {futureDates.map(d => (
                  <div key={d} className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 capitalize">
                      {formatSlotDate(d)}
                    </p>
                    {grouped[d].map(slot => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-blue-700 dark:text-blue-400">
                            {formatTime(slot.time_from)} → {formatTime(slot.time_to)}
                          </span>
                          {slot.reason && (
                            <span className="text-xs text-zinc-400">— {slot.reason}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id}
                          className="text-zinc-300 hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-500 transition-colors"
                          title="Supprimer ce créneau"
                        >
                          {deletingId === slot.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {futureDates.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Aucun créneau bloqué à venir.
              </p>
            )}

            {pastDates.length > 0 && (
              <details className="group">
                <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-500 select-none list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                  Voir les créneaux passés ({pastDates.length} jours)
                </summary>
                <div className="mt-2 space-y-1">
                  {pastDates.map(d => (
                    <div key={d} className="rounded border border-zinc-100 dark:border-zinc-800 p-2 opacity-50">
                      <p className="text-xs font-medium text-zinc-500 capitalize">{formatSlotDate(d)}</p>
                      {grouped[d].map(slot => (
                        <div key={slot.id} className="text-xs font-mono text-zinc-400">
                          {formatTime(slot.time_from)} → {formatTime(slot.time_to)}
                          {slot.reason ? ` — ${slot.reason}` : ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
