"use client";

import Image from "next/image";
import { X } from "lucide-react";
import {
  type Booking,
  cancellationPolicyLabel,
  formatBookingDate,
  formatBookingTimeRange,
  formatProjectSummary,
  getBookingStatusMeta,
  splitClientName,
} from "@/lib/pro/bookings";
import { Button } from "@/components/ui/button";

type Props = {
  booking: Booking;
  onClose: () => void;
};

export function BookingDetailModal({ booking, onClose }: Props) {
  const { firstName, lastName } = splitClientName(booking.client_name);
  const status = getBookingStatusMeta(booking.status);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
              Fiche RDV
            </p>
            <h2
              id="booking-detail-title"
              className="mt-1 text-xl font-bold text-zinc-50"
            >
              {booking.client_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {formatBookingDate(booking.booking_date)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-amber-400/90">
              {formatBookingTimeRange(
                booking.booking_date,
                booking.duration_minutes,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
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
            <p className="mt-2 text-sm font-medium text-amber-400/90">
              {formatProjectSummary(booking)}
            </p>
            {booking.project_description && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {booking.project_description}
              </p>
            )}
            {booking.reference_image_url && (
              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-zinc-800">
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

        <div className="border-t border-zinc-800 px-6 py-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-200">{value}</dd>
    </div>
  );
}
