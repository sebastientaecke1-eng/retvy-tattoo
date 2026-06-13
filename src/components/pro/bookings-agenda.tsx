"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type AgendaView,
  type Booking,
  bookingsInRange,
  endOfMonth,
  endOfWeek,
  formatBookingTimeCompact,
  formatMonthLabel,
  formatStyleZone,
  formatWeekRangeLabel,
  getBookingStatusMeta,
  getMonthGridDays,
  getWeekDays,
  isBookingOnCalendarDay,
  isSameDay,
  shiftMonth,
  shiftWeek,
  startOfMonth,
  startOfWeek,
} from "@/lib/pro/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Props = {
  bookings: Booking[];
  view: AgendaView;
  anchor: Date;
  onViewChange: (view: AgendaView) => void;
  onAnchorChange: (date: Date) => void;
  onSelectBooking: (booking: Booking) => void;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function BookingsAgenda({
  bookings,
  view,
  anchor,
  onViewChange,
  onAnchorChange,
  onSelectBooking,
}: Props) {
  const rangeStart =
    view === "week" ? startOfWeek(anchor) : startOfMonth(anchor);
  const rangeEnd = view === "week" ? endOfWeek(anchor) : endOfMonth(anchor);
  const visible = bookingsInRange(bookings, rangeStart, rangeEnd);

  function goPrev() {
    onAnchorChange(
      view === "week" ? shiftWeek(anchor, -1) : shiftMonth(anchor, -1),
    );
  }

  function goNext() {
    onAnchorChange(
      view === "week" ? shiftWeek(anchor, 1) : shiftMonth(anchor, 1),
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950/80">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500/80">
            Agenda
          </p>
          <p className="mt-1 text-lg font-medium text-zinc-100">
            {view === "week"
              ? formatWeekRangeLabel(anchor)
              : formatMonthLabel(anchor)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-800 p-0.5">
            <ToggleBtn
              active={view === "week"}
              onClick={() => onViewChange("week")}
            >
              Semaine
            </ToggleBtn>
            <ToggleBtn
              active={view === "month"}
              onClick={() => onViewChange("month")}
            >
              Mois
            </ToggleBtn>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goPrev}
              aria-label="Période précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goNext}
              aria-label="Période suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {view === "week" ? (
          <WeekView
            anchor={anchor}
            bookings={visible}
            onSelectBooking={onSelectBooking}
          />
        ) : (
          <MonthView
            anchor={anchor}
            bookings={visible}
            onSelectBooking={onSelectBooking}
          />
        )}
      </CardContent>
    </Card>
  );
}

function WeekView({
  anchor,
  bookings,
  onSelectBooking,
}: {
  anchor: Date;
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}) {
  const days = getWeekDays(anchor);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day, index) => {
        const dayBookings = bookings.filter((b) =>
          isBookingOnCalendarDay(b.booking_date, day),
        );
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toISOString()}
            className={`flex min-h-[400px] flex-col rounded-xl border p-3 ${
              isToday
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <div className="shrink-0 border-b border-zinc-800/80 pb-2">
              <p className="text-xs font-medium text-zinc-500">
                {WEEKDAY_LABELS[index]}
              </p>
              <p
                className={`text-sm font-semibold ${
                  isToday ? "text-blue-400" : "text-zinc-200"
                }`}
              >
                {day.getDate()}
              </p>
            </div>
            <div className="mt-2 flex flex-1 flex-col overflow-y-auto">
              {dayBookings.length === 0 ? (
                <p className="text-xs text-zinc-600">Aucun RDV</p>
              ) : (
                dayBookings.map((b, i) => (
                  <div
                    key={b.id}
                    className={i > 0 ? "border-t border-zinc-700 pt-2" : undefined}
                  >
                    <AgendaBookingChip
                      booking={b}
                      onClick={() => onSelectBooking(b)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  anchor,
  bookings,
  onSelectBooking,
}: {
  anchor: Date;
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}) {
  const days = getMonthGridDays(anchor);
  const month = anchor.getMonth();

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <p
            key={label}
            className="py-1 text-center text-xs font-medium text-zinc-500"
          >
            {label}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const inMonth = day.getMonth() === month;
          const dayBookings = bookings.filter((b) =>
            isBookingOnCalendarDay(b.booking_date, day),
          );
          const isToday = isSameDay(day, new Date());
          const count = dayBookings.length;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth || count === 0}
              onClick={() => {
                if (count === 1) onSelectBooking(dayBookings[0]);
              }}
              className={`flex min-h-[120px] flex-col rounded-xl border p-3 text-left transition-colors ${
                inMonth
                  ? isToday
                    ? "border-blue-500/40 bg-blue-500/5"
                    : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                  : "cursor-default border-transparent bg-transparent opacity-40"
              } ${inMonth && count > 0 ? "hover:bg-zinc-900/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-1">
                <p
                  className={`text-sm font-semibold ${
                    isToday ? "text-blue-400" : "text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </p>
                {inMonth && count > 0 && (
                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                    {count} RDV
                  </span>
                )}
              </div>
              {inMonth && count > 0 && (
                <p className="mt-auto pt-3 text-xs text-zinc-500">
                  {count === 1
                    ? `${formatBookingTimeCompact(dayBookings[0].booking_date)} · ${dayBookings[0].client_name}`
                    : `${count} rendez-vous`}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgendaBookingChip({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: () => void;
}) {
  const status = getBookingStatusMeta(booking.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
    >
      <p className="text-sm font-semibold text-blue-400">
        {formatBookingTimeCompact(booking.booking_date)}
      </p>
      <p className="mt-1.5 text-sm font-medium text-zinc-100">
        {booking.client_name}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        {formatStyleZone(booking)}
      </p>
      <span
        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
      >
        {status.label}
      </span>
    </button>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-blue-500/15 px-3 py-1.5 text-sm font-medium text-blue-400"
          : "rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      }
    >
      {children}
    </button>
  );
}
