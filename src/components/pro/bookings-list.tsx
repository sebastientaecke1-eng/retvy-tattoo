"use client";

import Link from "next/link";
import { Ban, Phone } from "lucide-react";
import { useMemo } from "react";
import {
  type Booking,
  type ListFilter,
  type ProBlockedDate,
  filterBlockedDatesByListPeriod,
  filterBookingsByListPeriod,
  formatBlockedDate,
  formatBookingDate,
  formatBookingTimeRange,
  formatProjectSummary,
  getBookingStatusMeta,
} from "@/lib/pro/bookings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Props = {
  bookings: Booking[];
  blockedDates: ProBlockedDate[];
  filter: ListFilter;
  onFilterChange: (filter: ListFilter) => void;
  onSelectBooking: (booking: Booking) => void;
};

type ListEntry =
  | { kind: "booking"; sortKey: number; booking: Booking }
  | { kind: "blocked"; sortKey: number; blocked: ProBlockedDate };

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tous" },
];

function blockedSortKey(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

function mergeListEntries(
  bookings: Booking[],
  blockedDates: ProBlockedDate[],
  filter: ListFilter,
): ListEntry[] {
  const filteredBookings = filterBookingsByListPeriod(bookings, filter);
  const filteredBlocked = filterBlockedDatesByListPeriod(blockedDates, filter);

  const entries: ListEntry[] = [
    ...filteredBookings.map((booking) => ({
      kind: "booking" as const,
      sortKey: new Date(booking.booking_date).getTime(),
      booking,
    })),
    ...filteredBlocked.map((blocked) => ({
      kind: "blocked" as const,
      sortKey: blockedSortKey(blocked.blocked_date),
      blocked,
    })),
  ];

  return entries.sort((a, b) => a.sortKey - b.sortKey);
}

export function BookingsList({
  bookings,
  blockedDates,
  filter,
  onFilterChange,
  onSelectBooking,
}: Props) {
  const entries = useMemo(
    () => mergeListEntries(bookings, blockedDates, filter),
    [bookings, blockedDates, filter],
  );

  return (
    <Card>
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
                  : "rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
            Aucun rendez-vous pour cette période.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200/80 rounded-xl border border-zinc-200 dark:divide-zinc-800/80 dark:border-zinc-800">
            {entries.map((entry) =>
              entry.kind === "booking" ? (
                <BookingListItem
                  key={`booking-${entry.booking.id}`}
                  booking={entry.booking}
                  onClick={() => onSelectBooking(entry.booking)}
                />
              ) : (
                <BlockedDayListItem
                  key={`blocked-${entry.blocked.blocked_date}`}
                  blocked={entry.blocked}
                />
              ),
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BlockedDayListItem({ blocked }: { blocked: ProBlockedDate }) {
  return (
    <li className="bg-amber-500/5">
      <div className="flex w-full flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Ban className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="font-medium text-amber-400">Jour bloqué</p>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              Indisponible
            </span>
          </div>
          {blocked.reason ? (
            <p className="mt-1 text-sm text-amber-400/80">{blocked.reason}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Aucun motif renseigné
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-600">
            {formatBlockedDate(blocked.blocked_date)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Link
            href="/pro/dashboard/disponibilites"
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            Gérer dans Disponibilités
          </Link>
        </div>
      </div>
    </li>
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
        className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{booking.client_name}</p>
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
