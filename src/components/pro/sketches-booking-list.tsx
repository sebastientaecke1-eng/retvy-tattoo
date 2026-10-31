"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, MessageSquare, X } from "lucide-react";
import type { Booking } from "@/lib/pro/bookings";
import {
  formatBookingDate,
  formatProjectSummary,
  splitClientName,
} from "@/lib/pro/bookings";
import type { BookingSketch, SketchStatus } from "@/lib/pro/sketches";
import { getSketchStatusMeta } from "@/lib/pro/sketches";
import { Button } from "@/components/ui/button";
import { BookingRescheduleDrawer } from "@/components/pro/booking-reschedule-drawer";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  bookings: Booking[];
  sketchesByBookingId: Record<string, BookingSketch>;
};

function sketchStatusForBooking(
  sketchesByBookingId: Record<string, BookingSketch>,
  bookingId: string,
): SketchStatus {
  return sketchesByBookingId[bookingId]?.status ?? "pending";
}

export function SketchesBookingList({ bookings, sketchesByBookingId }: Props) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<(typeof bookings)[0] | null>(null);
  // Dates locales mises à jour après reschedule
  const [rescheduledDates, setRescheduledDates] = useState<Record<string, string>>({});

  const activeBookings = bookings
    .filter((b) => b.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(a.booking_date).getTime() -
        new Date(b.booking_date).getTime(),
    );

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/pro/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erreur lors de l'annulation.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setCancellingId(null);
      setConfirmId(null);
    }
  }

  if (activeBookings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Croquis &amp; validation</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Aucun rendez-vous actif pour le moment.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Croquis &amp; validation</h1>
        <p className="mt-1 text-zinc-500">
          Échangez avec vos clients et validez les croquis avant le RDV.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4">
        {activeBookings.map((booking) => {
          const { firstName, lastName } = splitClientName(booking.client_name);
          const displayName = [firstName, lastName].filter(Boolean).join(" ");
          const status = sketchStatusForBooking(sketchesByBookingId, booking.id);
          const statusMeta = getSketchStatusMeta(status);
          const isConfirming = confirmId === booking.id;
          const isCancelling = cancellingId === booking.id;

          return (
            <Card key={booking.id}>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {displayName || booking.client_name}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatBookingDate(rescheduledDates[booking.id] ?? booking.booking_date)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {formatProjectSummary(booking)}
                  </p>
                  {booking.project_description && (
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                      {booking.project_description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  {isConfirming ? (
                    <>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 sm:mr-2">
                        Confirmer l&apos;annulation ?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCancelling}
                        onClick={() => handleCancel(booking.id)}
                        className="w-full border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 sm:w-auto"
                      >
                        {isCancelling ? "Annulation…" : "Oui, annuler"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmId(null)}
                        className="w-full sm:w-auto"
                      >
                        Non, garder
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleBooking(booking)}
                        className="w-full gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/40 sm:w-auto"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Modifier l&apos;horaire
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmId(booking.id)}
                        className="w-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/40 sm:w-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                        Annuler
                      </Button>
                      <Link href={`/pro/dashboard/croquis/${booking.id}`} className="w-full sm:w-auto">
                        <Button type="button" className="w-full sm:w-auto">
                          <MessageSquare className="h-4 w-4" />
                          Ouvrir le tchat croquis
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>

      {rescheduleBooking && (
        <BookingRescheduleDrawer
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onSuccess={(newDate) => {
            setRescheduledDates((prev) => ({ ...prev, [rescheduleBooking.id]: newDate }));
            setRescheduleBooking(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
