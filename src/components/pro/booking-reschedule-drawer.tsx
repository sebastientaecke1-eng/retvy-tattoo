"use client";

import { useState } from "react";
import { X, Calendar, Loader2, Check } from "lucide-react";
import { parisWallTimeToUtcIso, parisDateTimeParts } from "@/lib/datetime/paris";
import type { Booking } from "@/lib/pro/bookings";
import { formatBookingDate, formatBookingTime } from "@/lib/pro/bookings";
import { Button } from "@/components/ui/button";

type Props = {
  booking: Booking;
  onClose: () => void;
  onSuccess: (newBookingDate: string) => void;
};

/** Formate l'heure : insère le ':' après 2 chiffres */
function fmtTime(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length >= 3) return digits.slice(0, 2) + ":" + digits.slice(2, 4);
  return digits;
}

/** Essaie de parser une date texte libre → { year, month, day } ou null */
function parseDate(text: string): { year: number; month: number; day: number } | null {
  const t = text.trim();
  if (!t) return null;

  // Formats numériques : DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY
  const num = t.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/);
  if (num) {
    const day = parseInt(num[1], 10);
    const month = parseInt(num[2], 10);
    let year = parseInt(num[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { year, month, day };
    }
  }

  // Formats avec mois en lettres : "22 sept 2026", "22 septembre", "22/09", "lun 22 sept"
  const MONTHS: Record<string, number> = {
    jan: 1, janv: 1, janvier: 1,
    fév: 2, fev: 2, févr: 2, fevr: 2, février: 2, fevrier: 2,
    mar: 3, mars: 3,
    avr: 4, avril: 4,
    mai: 5,
    jun: 6, juin: 6,
    jul: 7, juil: 7, juillet: 7,
    aoû: 8, aou: 8, août: 8, aout: 8,
    sep: 9, sept: 9, septembre: 9,
    oct: 10, octobre: 10,
    nov: 11, novembre: 11,
    déc: 12, dec: 12, décembre: 12, decembre: 12,
  };

  const lower = t.toLowerCase();
  const dayMatch = lower.match(/(\d{1,2})/);
  const yearMatch = lower.match(/\b(202\d)\b/);
  let foundMonth: number | null = null;
  for (const [key, val] of Object.entries(MONTHS)) {
    if (lower.includes(key)) {
      foundMonth = val;
      break;
    }
  }

  if (dayMatch && foundMonth) {
    const day = parseInt(dayMatch[1], 10);
    const now = new Date();
    const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
    if (day >= 1 && day <= 31) {
      return { year, month: foundMonth, day };
    }
  }

  // Format YYYY-MM-DD
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return { year: parseInt(iso[1], 10), month: parseInt(iso[2], 10), day: parseInt(iso[3], 10) };
  }

  return null;
}

/** Parse heure texte libre → { hour, minute } ou null */
function parseTime(text: string): { hour: number; minute: number } | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[h:.](\d{2})$/);
  if (m) {
    const hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  // Juste des chiffres "1430"
  const digits = t.replace(/[^0-9]/g, "");
  if (digits.length === 4) {
    const hour = parseInt(digits.slice(0, 2), 10);
    const minute = parseInt(digits.slice(2, 4), 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  return null;
}

export function BookingRescheduleDrawer({ booking, onClose, onSuccess }: Props) {
  // Pré-remplir avec les valeurs actuelles
  const parts = parisDateTimeParts(booking.booking_date);
  const [dateText, setDateText] = useState(`${parts.day}/${parts.month}/${parts.year}`);
  const [timeText, setTimeText] = useState(`${parts.hour}:${parts.minute}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);

  const parsedDate = parseDate(dateText);
  const parsedTime = parseTime(timeText);

  let previewIso: string | null = null;
  if (parsedDate && parsedTime) {
    try {
      const dateStr = `${parsedDate.year}-${String(parsedDate.month).padStart(2, "0")}-${String(parsedDate.day).padStart(2, "0")}`;
      const timeStr = `${String(parsedTime.hour).padStart(2, "0")}:${String(parsedTime.minute).padStart(2, "0")}`;
      previewIso = parisWallTimeToUtcIso(dateStr, timeStr);
    } catch {
      previewIso = null;
    }
  }

  const isValid = previewIso !== null && new Date(previewIso).getTime() > Date.now();

  async function handleSubmit() {
    if (!previewIso || !isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pro/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ booking_date: previewIso }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; booking_date?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Erreur lors de la modification");
      }
      setNewDate(previewIso);
      setDone(true);
      onSuccess(previewIso);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center bg-black/50 p-4 dark:bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500/80">
              Modifier l&apos;horaire
            </p>
            <h2 id="reschedule-title" className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {booking.client_name}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Actuellement : {formatBookingDate(booking.booking_date)} à {formatBookingTime(booking.booking_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-600 dark:text-emerald-400">
              <p className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4 shrink-0" />
                RDV déplacé avec succès.
              </p>
              {newDate && (
                <p className="mt-1 text-xs">
                  Nouveau créneau : {formatBookingDate(newDate)} à {formatBookingTime(newDate)}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reschedule-date"
                    className="block text-xs font-semibold uppercase tracking-widest text-zinc-500"
                  >
                    Nouvelle date
                  </label>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Ex : 22/09/2026, 22 sept 2026, lun 22 septembre
                  </p>
                  <input
                    id="reschedule-date"
                    type="text"
                    value={dateText}
                    onChange={(e) => setDateText(e.target.value)}
                    placeholder="22/09/2026"
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reschedule-time"
                    className="block text-xs font-semibold uppercase tracking-widest text-zinc-500"
                  >
                    Nouvelle heure
                  </label>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Ex : 14:30, 14h30, 1430
                  </p>
                  <input
                    id="reschedule-time"
                    type="text"
                    value={timeText}
                    onChange={(e) => setTimeText(fmtTime(e.target.value))}
                    placeholder="14:30"
                    maxLength={5}
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Prévisualisation */}
              {previewIso && isValid && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-400">
                    <Calendar className="h-3.5 w-3.5" />
                    Nouveau créneau
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatBookingDate(previewIso)}
                  </p>
                  <p className="text-sm font-medium text-blue-400">
                    {formatBookingTime(previewIso)}
                  </p>
                </div>
              )}
              {previewIso && !isValid && (
                <p className="text-xs text-amber-500">Le créneau doit être dans le futur.</p>
              )}

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          {done ? (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fermer
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                disabled={!isValid || loading}
                onClick={() => void handleSubmit()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Déplacer dans l'agenda"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
