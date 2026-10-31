"use client";

import { useState } from "react";
import { AlertTriangle, CalendarRange, Loader2 } from "lucide-react";
import type { BlockPreviewResult } from "@/lib/pro/block-availabilities";
import { expandDateRangeInclusive } from "@/lib/pro/block-availabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Props = {
  onBlockedDatesAdded: (dates: string[]) => void;
  onRangeChange?: (dates: string[]) => void;
};

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBookingDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BlockDateRangeSection({ onBlockedDatesAdded, onRangeChange }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<BlockPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handlePreview() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const res = await fetch("/api/pro/availabilities/block-preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          reason: reason.trim() || undefined,
        }),
      });
      const data = (await res.json()) as BlockPreviewResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec de l'aperçu");
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/pro/availabilities/block-apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          reason: reason.trim() || undefined,
          confirmed: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        blocked_dates_added?: number;
        refunds_pending?: number;
        refunds_failed?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "Échec du blocage");

      onBlockedDatesAdded(preview.dates);
      onRangeChange?.([]);
      const cancelledLabel =
        preview.summary.total_bookings > 0
          ? ` ${preview.summary.total_bookings} RDV annulé(s).`
          : "";
      setSuccess(`Blocage confirmé. Remboursements et emails en cours.${cancelledLabel}`);
      setPreview(null);
      setDateFrom("");
      setDateTo("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setApplying(false);
    }
  }

  const canPreview = Boolean(dateFrom && dateTo && dateTo >= dateFrom);

  return (
    <Card>
      <CardHeader>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-500/80">
          <CalendarRange className="h-4 w-4" />
          Bloquer une plage de dates
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Sélectionnez une période continue. Les RDV confirmés ou avec acompte
          payé seront annulés et remboursés après votre confirmation.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Du
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const val = e.target.value;
                setDateFrom(val);
                if (val && dateTo && dateTo >= val) {
                  onRangeChange?.(expandDateRangeInclusive(val, dateTo));
                } else {
                  onRangeChange?.([]);
                }
              }}
              className="mt-1"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Au
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setDateTo(val);
                if (dateFrom && val && val >= dateFrom) {
                  onRangeChange?.(expandDateRangeInclusive(dateFrom, val));
                } else {
                  onRangeChange?.([]);
                }
              }}
              className="mt-1"
            />
          </label>
        </div>

        <label className="block text-sm text-zinc-600 dark:text-zinc-400">
          Motif (optionnel)
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. gros projet, congés…"
            className="mt-1"
            maxLength={500}
          />
        </label>

        <Button
          type="button"
          variant="outline"
          disabled={!canPreview || loading}
          onClick={handlePreview}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse…
            </>
          ) : (
            "Vérifier les RDV impactés"
          )}
        </Button>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        )}

        {preview && (
          <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {preview.summary.total_bookings === 0
                    ? "Aucun RDV impacté"
                    : `${preview.summary.total_bookings} RDV impacté(s)`}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Plage : {formatDateLabel(dateFrom)} → {formatDateLabel(dateTo)}{" "}
                  ({preview.dates.length} jour
                  {preview.dates.length > 1 ? "s" : ""})
                </p>
                {preview.summary.refund_count > 0 && (
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                    Remboursements : {preview.summary.refund_count} acompte(s) —{" "}
                    <strong>{preview.summary.total_refund_eur} €</strong> au total
                  </p>
                )}
              </div>
            </div>

            {preview.impacted.length > 0 && (
              <ul className="space-y-2">
                {preview.impacted.map((booking) => (
                  <li
                    key={booking.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-200">
                      {booking.client_name}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {formatBookingDateTime(booking.booking_date)} —{" "}
                      {booking.status === "confirmed" ? "Confirmé" : "En attente"}
                      {booking.refund_eligible
                        ? ` · Remboursement ${booking.refund_amount_eur} €`
                        : " · Annulation simple"}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={applying}
                onClick={handleApply}
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Application…
                  </>
                ) : preview.summary.total_bookings > 0 ? (
                  "Confirmer le blocage et les annulations"
                ) : (
                  "Confirmer le blocage"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={applying}
                onClick={() => { setPreview(null); onRangeChange?.([]); }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
