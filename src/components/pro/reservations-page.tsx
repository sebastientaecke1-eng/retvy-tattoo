"use client";

import { useState } from "react";
import type {
  AgendaView,
  Booking,
  ListFilter,
  ProBlockedDate,
  ProBlockedSlot,
} from "@/lib/pro/bookings";
import { BookingDetailModal } from "@/components/pro/booking-detail-modal";
import { CreateBookingModal } from "@/components/pro/create-booking-modal";
import type { PlanTier } from "@/lib/stripe/plans";
import { BookingsAgenda } from "@/components/pro/bookings-agenda";
import { BookingsList } from "@/components/pro/bookings-list";

type Props = {
  initialBookings: Booking[];
  blockedDates: ProBlockedDate[];
  blockedSlots?: ProBlockedSlot[];
  subscriptionTier?: PlanTier;
};

export function ReservationsPage({
  initialBookings,
  blockedDates,
  blockedSlots = [],
  subscriptionTier = "free",
}: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [agendaView, setAgendaView] = useState<AgendaView>("week");
  const [agendaAnchor, setAgendaAnchor] = useState(() => new Date());
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Mes RDV</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Agenda et liste de vos rendez-vous clients.
          </p>
        </div>
        <CreateBookingModal
          subscriptionTier={subscriptionTier}
          onCreated={(b) => {
            // Ajouter le booking à la liste locale pour feedback immédiat
            setBookings(prev => [{
              id: b.id,
              client_name: b.client_name,
              slot_date: b.slot_date,
              slot_time: b.slot_time,
              duration_minutes: b.duration_minutes,
              status: "confirmed",
              deposit_paid: true,
              deposit_amount: 0,
              booking_date: new Date().toISOString(),
              client_id: null, client_email: null, client_phone: null,
              project_description: null, style: null, zone: null, size: null,
              reference_image_url: null, color_preference: null,
              cancellation_policy: "flexible",
              stripe_checkout_session_id: null, stripe_payment_intent_id: null,
              stripe_charge_id: null, stripe_connect_account_id: null,
              refund_stripe_id: null, refund_status: "none",
              refunded_at: null, cancelled_by: null, cancellation_reason: null,
              client_action: null, rescheduled_to_booking_id: null,
              rescheduled_from_booking_id: null, cancelled_at: null,
              created_at: new Date().toISOString(),
              pro_profile_id: null, artist_slug: null, artist_name: null, artist_studio: null,
            } as unknown as import("@/lib/pro/bookings").Booking, ...prev]);
          }}
        />
      </div>

      <BookingsAgenda
        bookings={bookings}
        blockedDates={blockedDates}
        blockedSlots={blockedSlots}
        view={agendaView}
        anchor={agendaAnchor}
        onViewChange={setAgendaView}
        onAnchorChange={setAgendaAnchor}
        onSelectBooking={setSelectedBooking}
      />

      <BookingsList
        bookings={bookings}
        blockedDates={blockedDates}
        filter={listFilter}
        onFilterChange={setListFilter}
        onSelectBooking={setSelectedBooking}
      />

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancelSuccess={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
