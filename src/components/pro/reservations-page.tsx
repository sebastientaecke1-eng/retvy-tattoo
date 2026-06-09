"use client";

import { useState } from "react";
import type { AgendaView, Booking, ListFilter } from "@/lib/pro/bookings";
import { BookingDetailModal } from "@/components/pro/booking-detail-modal";
import { BookingsAgenda } from "@/components/pro/bookings-agenda";
import { BookingsList } from "@/components/pro/bookings-list";

type Props = {
  initialBookings: Booking[];
};

export function ReservationsPage({ initialBookings }: Props) {
  const [agendaView, setAgendaView] = useState<AgendaView>("week");
  const [agendaAnchor, setAgendaAnchor] = useState(() => new Date());
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Mes RDV</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Agenda et liste de vos rendez-vous clients.
        </p>
      </div>

      <BookingsAgenda
        bookings={initialBookings}
        view={agendaView}
        anchor={agendaAnchor}
        onViewChange={setAgendaView}
        onAnchorChange={setAgendaAnchor}
        onSelectBooking={setSelectedBooking}
      />

      <BookingsList
        bookings={initialBookings}
        filter={listFilter}
        onFilterChange={setListFilter}
        onSelectBooking={setSelectedBooking}
      />

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
