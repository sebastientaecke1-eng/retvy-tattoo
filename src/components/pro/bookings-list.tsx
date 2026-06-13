"use client";

import { Phone } from "lucide-react";
import {
  type Booking,
  type ListFilter,
  filterBookingsByListPeriod,
  formatBookingDate,
  formatBookingTimeRange,
  formatProjectSummary,
  getBookingStatusMeta,
} from "@/lib/pro/bookings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Props = {
  bookings: Booking[];
  filter: ListFilter;
  onFilterChange: (filter: ListFilter) => void;
  onSelectBooking: (booking: Booking) => void;
};

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tous" },
];

export function BookingsList({
  bookings,
  filter,
  onFilterChange,
  onSelectBooking,
}: Props) {
  const filtered = filterBookingsByListPeriod(bookings, filter);

  return (
    <Card className="border-zinc-800 bg-zinc-950/80">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500/80">
          Liste des RDV
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={
                filter === f.id
                  ? "rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400"
                  : "rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Aucun rendez-vous pour cette période.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
            {filtered.map((booking) => (
              <BookingListItem
                key={booking.id}
                booking={booking}
                onClick={() => onSelectBooking(booking)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BookingListItem({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: () => void;
}) {
  const status = getBookingStatusMeta(booking.status);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-100">{booking.client_name}</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          {booking.client_phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {booking.client_phone}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-400">
            {formatProjectSummary(booking)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {formatBookingDate(booking.booking_date)} ·{" "}
            {formatBookingTimeRange(
              booking.booking_date,
              booking.duration_minutes,
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Acompte
          </p>
          <p
            className={
              booking.deposit_paid
                ? "text-sm font-medium text-emerald-400"
                : "text-sm font-medium text-blue-400"
            }
          >
            {booking.deposit_amount > 0
              ? booking.deposit_paid
                ? `${booking.deposit_amount} € payé`
                : `${booking.deposit_amount} € en attente`
              : "—"}
          </p>
        </div>
      </button>
    </li>
  );
}
