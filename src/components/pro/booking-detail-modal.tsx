"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import {
  type Booking,
  cancellationPolicyLabel,
  formatBookingDate,
  formatBookingTimeRange,
  formatProjectSummary,
  getBookingStatusMeta,
  splitClientName,
} from "@/lib/pro/bookings";
import { colorPreferenceLabel } from "@/lib/ink/color-preference";
import { Button } from "@/components/ui/button";
import { BookingRescheduleDrawer } from "@/components/pro/booking-reschedule-drawer";

type Props = {
  booking: Booking;
  onClose: () => void;
  onCancelSuccess?: (bookingId: string) => void;
  onRescheduleSuccess?: (bookingId: string, newDate: string) => void;
};

export function BookingDetailModal({ booking, onClose, onCancelSuccess, onRescheduleSuccess }: Props) {
  const router = useRouter();
  const { firstName, lastName } = splitClientName(booking.client_name);
  const status = getBookingStatusMeta(booking.status);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);
  const [refundStatus, setRefundStatus] = useState<"refunded" | "failed" | "no_deposit" | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [currentBookingDate, setCurrentBookingDate] = useState(booking.booking_date);

  const isCancellable =
    booking.status !== "cancelled" &&
    new Date(booking.booking_date).getTime() > Date.now();

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/pro/bookings/${booking.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        refund?: { status: "refunded" | "failed" | "no_deposit"; amount: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Impossible d\'annuler");
      }
      setCancelDone(true);
      setRefundStatus(data.refund?.status ?? "no_deposit");
      onCancelSuccess?.(booking.id);
      router.refresh();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 dark:bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500/80">
              Fiche RDV
            </p>
            <h2
              id="booking-detail-title"
              className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              {booking.client_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {formatBookingDate(currentBookingDate)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-blue-400/90">
              {formatBookingTimeRange(
                booking.booking_date,
                booking.duration_minutes,
              )}
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

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Client
            </h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <Row label="Prénom" value={firstName || "—"} />
              <Row label="Nom" value={lastName || "—"} />
              <Row label="Email" value={booking.client_email ?? "—"} />
              <Row label="Téléphone" value={booking.client_phone ?? "—"} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Projet
            </h3>
            <p className="mt-2 text-sm font-medium text-blue-400/90">
              {formatProjectSummary(booking)}
            </p>
            {booking.color_preference && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Couleur : {colorPreferenceLabel(booking.color_preference)}
              </p>
            )}
            {booking.project_description && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {booking.project_description}
              </p>
            )}
            {booking.reference_image_url && (
              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Image
                  src={booking.reference_image_url}
                  alt="Référence client"
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                  unoptimized
                />
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Acompte & annulation
            </h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <Row
                label="Acompte reçu"
                value={
                  booking.deposit_paid
                    ? `${booking.deposit_amount} € (payé)`
                    : booking.deposit_amount > 0
                      ? `${booking.deposit_amount} € (en attente)`
                      : "Aucun acompte"
                }
              />
              <Row
                label="Politique d'annulation"
                value={cancellationPolicyLabel(booking.cancellation_policy)}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Statut du RDV
            </h3>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </section>
        </div>

        <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          {cancelDone ? (
            <div className="space-y-3">
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                refundStatus === "refunded"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              }`}>
                <p className="flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 shrink-0" />
                  RDV annulé — email envoyé au client.
                </p>
                {refundStatus === "refunded" && (
                  <p className="mt-1 text-xs">
                    Acompte de {booking.deposit_amount} € remboursé automatiquement.
                  </p>
                )}
                {refundStatus === "failed" && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Le remboursement automatique a échoué — vérifiez votre dashboard Stripe.
                  </p>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Fermer
              </Button>
            </div>
          ) : confirmCancel ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Confirmer l&apos;annulation ?
                </p>
                <p className="mt-1 text-xs">
                  Un email d&apos;excuse sera envoyé au client.
                  {booking.deposit_paid && booking.deposit_amount > 0
                    ? ` L'acompte de ${booking.deposit_amount} € sera remboursé automatiquement.`
                    : ""}
                </p>
              </div>
              {cancelError && (
                <p className="text-sm text-red-400">{cancelError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={cancelling}
                  onClick={() => setConfirmCancel(false)}
                >
                  Retour
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirmer l\'annulation"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              {isCancellable && (
                <Button
                  variant="outline"
                  className="flex-1 border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
                  onClick={() => setShowReschedule(true)}
                >
                  Modifier l&apos;horaire
                </Button>
              )}
              {isCancellable && (
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                  onClick={() => setConfirmCancel(true)}
                >
                  Annuler le RDV
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>

      {showReschedule && (
        <BookingRescheduleDrawer
          booking={{ ...booking, booking_date: currentBookingDate }}
          onClose={() => setShowReschedule(false)}
          onSuccess={(newDate) => {
            setCurrentBookingDate(newDate);
            setShowReschedule(false);
            onRescheduleSuccess?.(booking.id, newDate);
          }}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}
