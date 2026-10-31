"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { PlanTier } from "@/lib/stripe/plans";

type Props = {
  subscriptionTier: PlanTier;
  onCreated: (booking: { id: string; slot_date: string; slot_time: string; client_name: string; duration_minutes: number }) => void;
};

const DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480];

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function CreateBookingModal({ subscriptionTier, onCreated }: Props) {
  const canUse = subscriptionTier === "pro" || subscriptionTier === "premium";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [slotDate, setSlotDate] = useState(today);
  const [slotTime, setSlotTime] = useState("10:00");
  const [duration, setDuration] = useState(120);
  const [style, setStyle] = useState("");
  const [zone, setZone] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setClientName(""); setClientEmail(""); setClientPhone("");
    setSlotDate(today); setSlotTime("10:00"); setDuration(120);
    setStyle(""); setZone(""); setNotes(""); setError(null);
  }

  function close() { setOpen(false); reset(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientName.trim()) { setError("Le nom du client est requis."); return; }
    if (!slotDate) { setError("La date est requise."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/pro/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail || undefined,
          client_phone: clientPhone || undefined,
          slot_date: slotDate,
          slot_time: slotTime,
          duration_minutes: duration,
          style: style || undefined,
          zone: zone || undefined,
          notes: notes || undefined,
        }),
      });

      const j = await res.json() as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !j.ok) { setError(j.error ?? "Erreur lors de la création."); return; }

      onCreated({ id: j.id!, slot_date: slotDate, slot_time: slotTime, client_name: clientName, duration_minutes: duration });
      close();
    } finally {
      setSaving(false);
    }
  }


  // Bouton (toujours visible)
  const trigger = (
    <Button
      type="button"
      onClick={() => { if (canUse) setOpen(true); }}
      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
      title={!canUse ? "Disponible à partir du plan Pro" : undefined}
    >
      <CalendarPlus className="h-4 w-4" />
      Créer un RDV
    </Button>
  );

  // Gate pour plan insuffisant
  if (!canUse) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{trigger}</div>
        <div className="absolute -top-1 -right-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
            <Lock className="h-2.5 w-2.5" /> Pro+
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

          {/* Modal */}
          <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Créer un rendez-vous
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Client */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Client
                </p>
                <Input
                  placeholder="Nom du client *"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  required
                  className="h-9"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="email"
                    placeholder="Email (optionnel)"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="tel"
                    placeholder="Téléphone (optionnel)"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="h-9"
                  />
                </div>
              </section>

              {/* Date & heure */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Date & heure
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Date *</label>
                    <Input
                      type="date"
                      value={slotDate}
                      min={today}
                      onChange={e => setSlotDate(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Heure *</label>
                    <Input
                      type="time"
                      value={slotTime}
                      onChange={e => setSlotTime(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Durée</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          duration === d
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                      >
                        {formatDuration(d)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Détails optionnels */}
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Détails (optionnel)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Style (ex: Réaliste)"
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Zone (ex: Avant-bras)"
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    className="h-9"
                  />
                </div>
                <textarea
                  placeholder="Notes internes…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </section>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={close} className="h-9">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Création…" : "Confirmer le RDV"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
