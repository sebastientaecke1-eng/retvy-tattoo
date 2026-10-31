"use client";

import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import {
  type AgendaView,
  type Booking,
  type ProBlockedDate,
  type ProBlockedSlot,
  blockedDateMap,
  bookingsInRange,
  endOfMonth,
  endOfWeek,
  formatBookingTimeCompact,
  formatMonthLabel,
  formatStyleZone,
  formatWeekRangeLabel,
  getBlockedInfoForDay,
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
  blockedDates: ProBlockedDate[];
  blockedSlots?: ProBlockedSlot[];
  view: AgendaView;
  anchor: Date;
  onViewChange: (view: AgendaView) => void;
  onAnchorChange: (date: Date) => void;
  onSelectBooking: (booking: Booking) => void;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function truncateReason(reason: string, max = 60): string {
  return reason.length > max ? `${reason.slice(0, max)}…` : reason;
}

function dayColumnClass(isToday: boolean, blocked: boolean): string {
  if (isToday && blocked) {
    return "border-blue-500/40 bg-amber-500/5 ring-1 ring-amber-500/20";
  }
  if (blocked) {
    return "border-amber-500/30 bg-amber-500/5";
  }
  if (isToday) {
    return "border-blue-500/40 bg-blue-500/5";
  }
  return "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40";
}

function monthCellClass(
  inMonth: boolean,
  isToday: boolean,
  blocked: boolean,
  hasBookings: boolean,
): string {
  if (!inMonth) {
    return "cursor-default border-transparent bg-transparent opacity-40";
  }
  if (isToday && blocked) {
    return "border-blue-500/40 bg-amber-500/5 ring-1 ring-amber-500/20";
  }
  if (blocked) {
    return hasBookings
      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10"
      : "border-amber-500/30 bg-amber-500/5";
  }
  if (isToday) {
    return "border-blue-500/40 bg-blue-500/5";
  }
  return hasBookings
    ? "border-zinc-200/80 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800/80 dark:bg-zinc-900/30 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50"
    : "border-zinc-200/80 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900/30";
}

export function BookingsAgenda({
  bookings,
  blockedDates,
  blockedSlots = [],
  view,
  anchor,
  onViewChange,
  onAnchorChange,
  onSelectBooking,
}: Props) {
  const blockedMap = useMemo(
    () => blockedDateMap(blockedDates),
    [blockedDates],
  );

  // Map date → slots bloqués pour affichage dans l'agenda
  const slotsMap = useMemo(() => {
    const m = new Map<string, ProBlockedSlot[]>();
    for (const s of blockedSlots) {
      const existing = m.get(s.slot_date) ?? [];
      m.set(s.slot_date, [...existing, s]);
    }
    return m;
  }, [blockedSlots]);

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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500/80">
            Agenda
          </p>
          <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {view === "week"
              ? formatWeekRangeLabel(anchor)
              : formatMonthLabel(anchor)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
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
            blockedMap={blockedMap}
            slotsMap={slotsMap}
            onSelectBooking={onSelectBooking}
          />
        ) : (
          <MonthView
            anchor={anchor}
            bookings={visible}
            blockedMap={blockedMap}
            slotsMap={slotsMap}
            onSelectBooking={onSelectBooking}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BlockedDayBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <Ban className="h-3 w-3 shrink-0" />
      {compact ? "Bloqué" : "Jour bloqué"}
    </span>
  );
}

function BlockedDayBanner({ reason }: { reason: string | null }) {
  return (
    <div
      className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
      title={reason ?? undefined}
    >
      <p className="text-xs font-medium text-amber-400">Indisponible</p>
      {reason ? (
        <p className="mt-1 text-xs text-amber-400/80">{truncateReason(reason)}</p>
      ) : null}
    </div>
  );
}

function WeekView({
  anchor,
  bookings,
  blockedMap,
  slotsMap,
  onSelectBooking,
}: {
  anchor: Date;
  bookings: Booking[];
  blockedMap: Map<string, string | null>;
  slotsMap: Map<string, ProBlockedSlot[]>;
  onSelectBooking: (b: Booking) => void;
}) {
  const days = getWeekDays(anchor);

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day, index) => {
        const isoDay = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const dayBookings = bookings.filter((b) =>
          isBookingOnCalendarDay(b.booking_date, day),
        );
        const isToday = isSameDay(day, new Date());
        const { blocked, reason } = getBlockedInfoForDay(day, blockedMap);

        return (
          <div
            key={day.toISOString()}
            className={`flex min-h-[400px] flex-col rounded-xl border p-3 ${dayColumnClass(isToday, blocked)}`}
          >
            <div className="shrink-0 border-b border-zinc-200 pb-2 dark:border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-xs font-medium text-zinc-500">
                  {WEEKDAY_LABELS[index]}
                </p>
                {blocked ? <BlockedDayBadge /> : null}
              </div>
              <p
                className={`text-sm font-semibold ${
                  isToday ? "text-blue-400" : "text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {day.getDate()}
              </p>
              {blocked && reason ? (
                <p
                  className="mt-1 text-[11px] text-amber-400/80"
                  title={reason}
                >
                  {truncateReason(reason, 40)}
                </p>
              ) : null}
            </div>
            <div className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto">
              {blocked ? <BlockedDayBanner reason={reason} /> : null}
              {/* Créneaux horaires bloqués */}
              {!blocked && (slotsMap.get(isoDay) ?? []).map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1.5"
                  title={slot.reason ?? undefined}
                >
                  <Ban className="h-3 w-3 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-orange-400">
                      {slot.time_from.slice(0, 5)}–{slot.time_to.slice(0, 5)}
                    </p>
                    {slot.reason && (
                      <p className="text-[10px] text-orange-400/70 truncate">{slot.reason}</p>
                    )}
                  </div>
                </div>
              ))}
              {dayBookings.length === 0 && !blocked && (slotsMap.get(isoDay) ?? []).length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-600">Aucun RDV</p>
              ) : (
                dayBookings.map((b, i) => (
                  <div
                    key={b.id}
                    className={i > 0 ? "border-t border-zinc-200 pt-2 dark:border-zinc-700" : undefined}
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
  blockedMap,
  slotsMap,
  onSelectBooking,
}: {
  anchor: Date;
  bookings: Booking[];
  blockedMap: Map<string, string | null>;
  slotsMap: Map<string, ProBlockedSlot[]>;
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
          const { blocked, reason } = getBlockedInfoForDay(day, blockedMap);
          const isoDayM = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const monthSlots = slotsMap.get(isoDayM) ?? [];
          const interactive = inMonth && count > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!interactive}
              onClick={() => {
                if (count === 1) onSelectBooking(dayBookings[0]);
              }}
              className={`flex min-h-[120px] flex-col rounded-xl border p-3 text-left transition-colors ${monthCellClass(inMonth, isToday, blocked, count > 0)} ${interactive ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-start justify-between gap-1">
                <p
                  className={`text-sm font-semibold ${
                    isToday ? "text-blue-400" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </p>
                <div className="flex flex-col items-end gap-1">
                  {inMonth && blocked ? <BlockedDayBadge compact /> : null}
                  {inMonth && !blocked && monthSlots.length > 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                      <Ban className="h-2.5 w-2.5" />{monthSlots.length}
                    </span>
                  ) : null}
                  {inMonth && count > 0 ? (
                    <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                      {count} RDV
                    </span>
                  ) : null}
                </div>
              </div>
              {inMonth && blocked && reason ? (
                <p
                  className="mt-2 text-[11px] leading-snug text-amber-400/80"
                  title={reason}
                >
                  {truncateReason(reason, 36)}
                </p>
              ) : null}
              {inMonth && count > 0 ? (
                <p className="mt-auto pt-3 text-xs text-zinc-500">
                  {count === 1
                    ? `${formatBookingTimeCompact(dayBookings[0].booking_date)} · ${dayBookings[0].client_name}`
                    : `${count} rendez-vous`}
                </p>
              ) : inMonth && blocked ? (
                <p className="mt-auto pt-3 text-xs text-amber-400/70">
                  Indisponible
                </p>
              ) : null}
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
      className="w-full shrink-0 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
    >
      <p className="text-sm font-semibold text-blue-400">
        {formatBookingTimeCompact(booking.booking_date)}
      </p>
      <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
          : "rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
      }
    >
      {children}
    </button>
  );
}
