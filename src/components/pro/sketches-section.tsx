"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Send,
  Upload,
} from "lucide-react";
import type { Booking } from "@/lib/pro/bookings";
import {
  formatBookingDate,
  formatProjectSummary,
} from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import {
  getSketchStatusMeta,
  isSketchImageUrl,
} from "@/lib/pro/sketches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  bookings: Booking[];
  initialSketches: BookingSketch[];
};

export function SketchesSection({ bookings, initialSketches }: Props) {
  const confirmedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "confirmed")
        .sort(
          (a, b) =>
            new Date(a.booking_date).getTime() -
            new Date(b.booking_date).getTime(),
        ),
    [bookings],
  );

  const [selectedId, setSelectedId] = useState(
    confirmedBookings[0]?.id ?? "",
  );
  const [sketches, setSketches] = useState<Record<string, BookingSketch>>(
    () =>
      Object.fromEntries(
        initialSketches.map((sketch) => [sketch.booking_id, sketch]),
      ),
  );
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedBooking = confirmedBookings.find((b) => b.id === selectedId);
  const selectedSketch = selectedId ? sketches[selectedId] : undefined;
  const statusMeta = selectedSketch
    ? getSketchStatusMeta(selectedSketch.status)
    : null;

  function flashSuccess(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 3000);
  }

  async function handleUpload(file: File) {
    if (!selectedId) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.set("booking_id", selectedId);
      form.set("file", file);

      const res = await fetch("/api/pro/sketches/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await res.json()) as {
        error?: string;
        sketch?: BookingSketch;
      };

      if (!res.ok || !data.sketch) {
        throw new Error(data.error ?? "Échec de l'upload");
      }

      setSketches((prev) => ({
        ...prev,
        [selectedId]: data.sketch!,
      }));
      flashSuccess("Croquis uploadé");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    if (!selectedId) return;
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/pro/sketches/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: selectedId }),
      });
      const data = (await res.json()) as {
        error?: string;
        sketch?: BookingSketch;
      };

      if (!res.ok || !data.sketch) {
        throw new Error(data.error ?? "Échec de l'envoi");
      }

      setSketches((prev) => ({
        ...prev,
        [selectedId]: data.sketch!,
      }));
      flashSuccess("Croquis envoyé au client");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur envoi");
    } finally {
      setSending(false);
    }
  }

  if (confirmedBookings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <h1 className="text-2xl font-bold">Croquis &amp; validation</h1>
        <p className="mt-2 text-zinc-400">
          Aucun RDV confirmé pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Croquis &amp; validation</h1>
        <p className="mt-1 text-zinc-500">
          Uploadez un croquis, envoyez-le au client et suivez sa validation.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <label
              htmlFor="booking-select"
              className="text-sm font-medium text-zinc-300"
            >
              RDV confirmé
            </label>
            <select
              id="booking-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-blue-500/50"
            >
              {confirmedBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.client_name} —{" "}
                  {formatBookingDate(booking.booking_date)}
                </option>
              ))}
            </select>
          </div>

          {selectedBooking && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
              <p className="font-medium text-zinc-100">
                {selectedBooking.client_name}
              </p>
              <p className="mt-1 text-zinc-400">
                {formatBookingDate(selectedBooking.booking_date)}
              </p>
              <p className="mt-2 text-zinc-300">
                {formatProjectSummary(selectedBooking)}
              </p>
              {selectedBooking.project_description && (
                <p className="mt-2 text-zinc-500">
                  {selectedBooking.project_description}
                </p>
              )}
              {selectedBooking.client_email && (
                <p className="mt-2 text-zinc-500">
                  {selectedBooking.client_email}
                </p>
              )}
            </div>
          )}

          {statusMeta && selectedSketch && (
            <div
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}
            >
              {statusMeta.label}
            </div>
          )}

          {selectedSketch?.client_comment && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
              <p className="font-medium text-red-300">Commentaire du client</p>
              <p className="mt-1 text-zinc-300">
                {selectedSketch.client_comment}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-300">
              Upload du croquis
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-blue-500/50 hover:text-blue-400">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Upload en cours…" : "Choisir jpg, png ou pdf"}
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                disabled={uploading || !selectedId}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {selectedSketch?.sketch_url && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-300">Aperçu</p>
              {isSketchImageUrl(selectedSketch.sketch_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedSketch.sketch_url}
                  alt="Croquis"
                  className="max-h-80 rounded-xl border border-zinc-800 object-contain"
                />
              ) : (
                <a
                  href={selectedSketch.sketch_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir le PDF
                </a>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="inline-flex items-center gap-2 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              {success}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={
                sending ||
                !selectedSketch?.sketch_url ||
                selectedSketch.status === "approved"
              }
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer au client
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
