"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Booking } from "@/lib/pro/bookings";
import {
  formatBookingDate,
  formatProjectSummary,
  splitClientName,
} from "@/lib/pro/bookings";
import type { BookingSketch, SketchStatus } from "@/lib/pro/sketches";
import { getSketchStatusMeta } from "@/lib/pro/sketches";
import { Button } from "@/components/ui/button";
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
  const activeBookings = bookings
    .filter((b) => b.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(a.booking_date).getTime() -
        new Date(b.booking_date).getTime(),
    );

  if (activeBookings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <h1 className="text-2xl font-bold">Croquis &amp; validation</h1>
        <p className="mt-2 text-zinc-400">
          Aucun rendez-vous actif pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Croquis &amp; validation</h1>
        <p className="mt-1 text-zinc-500">
          Échangez avec vos clients et validez les croquis avant le RDV.
        </p>
      </div>

      <div className="grid gap-4">
        {activeBookings.map((booking) => {
          const { firstName, lastName } = splitClientName(booking.client_name);
          const displayName = [firstName, lastName].filter(Boolean).join(" ");
          const status = sketchStatusForBooking(sketchesByBookingId, booking.id);
          const statusMeta = getSketchStatusMeta(status);

          return (
            <Card
              key={booking.id}
              className="border-zinc-800 bg-zinc-950/80 transition-colors hover:border-zinc-700"
            >
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-zinc-100">
                      {displayName || booking.client_name}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {formatBookingDate(booking.booking_date)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {formatProjectSummary(booking)}
                  </p>
                  {booking.project_description && (
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                      {booking.project_description}
                    </p>
                  )}
                </div>
                <Link
                  href={`/pro/dashboard/croquis/${booking.id}`}
                  className="shrink-0"
                >
                  <Button type="button" className="w-full sm:w-auto">
                    <MessageSquare className="h-4 w-4" />
                    Ouvrir le tchat croquis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
