"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import type { ClientBooking } from "@/lib/client/bookings";
import {
  formatBookingDate,
  formatBookingTime,
  formatProjectSummary,
  getBookingStatusMeta,
} from "@/lib/pro/bookings";
import { styleLabel } from "@/lib/pro/public-profile";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/supabase/public-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function isBookingPast(bookingDate: string): boolean {
  return new Date(bookingDate).getTime() < Date.now();
}

export function ClientBookingsList({
  bookings,
}: {
  bookings: ClientBooking[];
}) {
  const router = useRouter();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmBooking, setConfirmBooking] = useState<ClientBooking | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function payDeposit(booking: ClientBooking) {
    setPayingId(booking.id);
    setError(null);
    try {
      const res = await fetch(`/api/client/bookings/${booking.id}/pay`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        error?: string;
        bookingId?: string;
        proSlug?: string;
        depositAmount?: number;
        reference?: string;
        bookingData?: Record<string, unknown>;
      };

      if (
        !res.ok ||
        !data.proSlug ||
        data.depositAmount == null ||
        !data.reference ||
        !data.bookingData
      ) {
        throw new Error(data.error ?? "Impossible de lancer le paiement");
      }

      const functionsBase = getPublicSupabaseUrl().replace(/\/$/, "");
      const checkoutRes = await fetch(
        `${functionsBase}/functions/v1/stripe-deposit`,
        {
          method: "POST",
          headers: {
            apikey: getPublicSupabaseAnonKey(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingData: data.bookingData,
            proSlug: data.proSlug,
            depositAmount: data.depositAmount,
            reference: data.reference,
            bookingId: data.bookingId,
          }),
        },
      );
      const checkout = (await checkoutRes.json()) as {
        url?: string;
        error?: string;
      };
      if (!checkoutRes.ok || !checkout.url) {
        throw new Error(checkout.error ?? "Erreur Stripe");
      }
      window.location.href = checkout.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur paiement");
      setPayingId(null);
    }
  }

  async function confirmCancel() {
    if (!confirmBooking) return;
    setCancellingId(confirmBooking.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/client/bookings/${confirmBooking.id}/cancel`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Impossible d'annuler le rendez-vous");
      }
      setConfirmBooking(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur annulation");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <Card className="mt-8 border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <h2 className="text-lg font-semibold text-zinc-100">
            Mes réservations
          </h2>
          <p className="text-sm text-zinc-500">
            Vos rendez-vous chez les tatoueurs Retvy.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
              Aucune réservation pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
              {bookings.map((booking) => (
                <ClientBookingItem
                  key={booking.id}
                  booking={booking}
                  paying={payingId === booking.id}
                  cancelling={cancellingId === booking.id}
                  onPay={() => void payDeposit(booking)}
                  onRequestCancel={() => setConfirmBooking(booking)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {confirmBooking && (
        <CancelBookingModal
          booking={confirmBooking}
          loading={cancellingId === confirmBooking.id}
          onClose={() => {
            if (!cancellingId) setConfirmBooking(null);
          }}
          onConfirm={() => void confirmCancel()}
        />
      )}
    </>
  );
}

function CancelBookingModal({
  booking,
  loading,
  onClose,
  onConfirm,
}: {
  booking: ClientBooking;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0A0A0A] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3
            id="cancel-booking-title"
            className="text-lg font-semibold text-zinc-50"
          >
            Annuler le rendez-vous
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Êtes-vous sûr de vouloir annuler ce RDV ? Cette action est
          irréversible.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          {booking.artist_name} — {formatBookingDate(booking.booking_date)} à{" "}
          {formatBookingTime(booking.booking_date)}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onClose}
          >
            Garder le RDV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onConfirm}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Annulation…
              </>
            ) : (
              "Confirmer l'annulation"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClientBookingItem({
  booking,
  paying,
  cancelling,
  onPay,
  onRequestCancel,
}: {
  booking: ClientBooking;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onRequestCancel: () => void;
}) {
  const status = getBookingStatusMeta(booking.status);
  const cancelled = booking.status === "cancelled";
  const past = isBookingPast(booking.booking_date);
  const canCancel = !cancelled && !past;
  const showPay =
    !cancelled && !booking.deposit_paid && booking.deposit_amount > 0;

  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/ink/${booking.artist_slug}`}
            className="font-medium text-amber-400 hover:text-amber-300"
          >
            {booking.artist_name}
          </Link>
          <Link
            href={`/ink/${booking.artist_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Voir le profil"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          {formatBookingDate(booking.booking_date)} à{" "}
          {formatBookingTime(booking.booking_date)}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {booking.style ? styleLabel(booking.style) : "—"}
          {booking.zone ? ` · ${booking.zone}` : ""}
        </p>
        {booking.project_description && (
          <p className="mt-1 text-xs text-zinc-500">
            {formatProjectSummary(booking)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {booking.deposit_paid ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
            <Check className="h-4 w-4" />
            Payé
          </span>
        ) : showPay ? (
          <>
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Acompte en attente
            </span>
            <Button size="sm" disabled={paying || cancelling} onClick={onPay}>
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Payer l'acompte — ${booking.deposit_amount} €`
              )}
            </Button>
          </>
        ) : null}

        {canCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={paying || cancelling}
            onClick={onRequestCancel}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Annuler le RDV"
            )}
          </Button>
        )}
      </div>
    </li>
  );
}
