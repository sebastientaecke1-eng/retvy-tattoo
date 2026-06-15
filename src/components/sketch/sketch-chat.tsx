"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
import type { BookingSketch, SketchStatus } from "@/lib/pro/sketches";
import {
  getSketchStatusMeta,
  isSketchImageUrl,
} from "@/lib/pro/sketches";
import type { SketchMessage } from "@/lib/sketch/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COBALT = "#0057FF";

type SketchChatProps = {
  role: "pro" | "client";
  bookingId: string;
  booking: Booking;
  initialSketch: BookingSketch | null;
  initialMessages: SketchMessage[];
  backHref: string;
  artistName?: string;
};

export function SketchChat({
  role,
  bookingId,
  booking,
  initialSketch,
  initialMessages,
  backHref,
  artistName,
}: SketchChatProps) {
  const apiBase =
    role === "pro"
      ? `/api/pro/sketches/${bookingId}`
      : `/api/client/sketches/${bookingId}`;

  const [sketch, setSketch] = useState<BookingSketch | null>(initialSketch);
  const [messages, setMessages] = useState<SketchMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const statusMeta = getSketchStatusMeta(
    (sketch?.status ?? "pending") as SketchStatus,
  );

  const refreshMessages = useCallback(async () => {
    const res = await fetch(`${apiBase}/messages`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages?: SketchMessage[];
      sketch?: BookingSketch | null;
    };
    if (data.messages) setMessages(data.messages);
    if (data.sketch !== undefined) setSketch(data.sketch);
  }, [apiBase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshMessages]);

  async function sendTextMessage() {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const data = (await res.json()) as { error?: string; message?: SketchMessage };
      if (!res.ok) throw new Error(data.error ?? "Échec envoi");
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur envoi");
    } finally {
      setSending(false);
    }
  }

  async function handleUpload(file: File) {
    if (role !== "pro") return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("booking_id", bookingId);
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
        throw new Error(data.error ?? "Échec upload");
      }
      setSketch(data.sketch);
      await refreshMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(status: SketchStatus, notify = true) {
    if (role !== "pro") return;
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/pro/sketches/${bookingId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notify }),
      });
      const data = (await res.json()) as {
        error?: string;
        sketch?: BookingSketch;
      };
      if (!res.ok || !data.sketch) {
        throw new Error(data.error ?? "Échec mise à jour statut");
      }
      setSketch(data.sketch);
      await refreshMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur statut");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function clientAction(action: "approve" | "revision") {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          message: action === "revision" ? revisionText.trim() : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: SketchMessage;
        sketch_status?: SketchStatus;
      };
      if (!res.ok) throw new Error(data.error ?? "Échec");
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      if (data.sketch_status && sketch) {
        setSketch({ ...sketch, status: data.sketch_status });
      } else if (data.sketch_status) {
        setSketch({
          id: "",
          booking_id: bookingId,
          pro_user_id: booking.user_id,
          client_email: booking.client_email ?? "",
          sketch_url: null,
          storage_path: null,
          status: data.sketch_status,
          client_comment: null,
          validation_token: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setRevisionText("");
      await refreshMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#0057FF]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-zinc-100">
            Tchat croquis
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {role === "client" && artistName ? `${artistName} · ` : ""}
            {formatBookingDate(booking.booking_date)}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {formatProjectSummary(booking)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            statusMeta.className,
          )}
        >
          {statusMeta.label}
        </span>
      </div>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardContent className="flex h-[min(60vh,520px)] flex-col pt-4">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Aucun message pour le moment.{" "}
                {role === "pro"
                  ? "Uploadez un croquis pour démarrer."
                  : "Votre tatoueur vous enverra bientôt un croquis."}
              </p>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} role={role} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {role === "pro" && (
            <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-[#0057FF]/50 hover:text-[#0057FF]">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Upload…" : "Uploader un croquis"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <select
                  value={sketch?.status ?? "pending"}
                  disabled={updatingStatus || !sketch}
                  onChange={(e) =>
                    void updateStatus(e.target.value as SketchStatus)
                  }
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#0057FF]/60"
                >
                  <option value="pending">En attente</option>
                  <option value="sent">Envoyé</option>
                  <option value="revision_requested">Modification demandée</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    updatingStatus ||
                    !sketch?.sketch_url ||
                    sketch?.status === "approved"
                  }
                  onClick={() => void updateStatus("sent")}
                  style={{ backgroundColor: COBALT }}
                  className="text-white hover:opacity-90"
                >
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer au client
                </Button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendTextMessage();
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message au client…"
                  disabled={sending}
                  className="border-zinc-800 bg-zinc-950"
                />
                <Button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{ backgroundColor: COBALT }}
                  className="shrink-0 text-white hover:opacity-90"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          )}

          {role === "client" && (
            <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
              {sketch?.status !== "approved" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={sending || !sketch}
                    onClick={() => void clientAction("approve")}
                    className="border-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Check className="h-4 w-4" />
                    Valider le croquis
                  </Button>
                </div>
              )}
              {sketch?.status !== "approved" && (
                <div className="space-y-2">
                  <Input
                    value={revisionText}
                    onChange={(e) => setRevisionText(e.target.value)}
                    placeholder="Décrivez la modification souhaitée…"
                    disabled={sending}
                    className="border-zinc-800 bg-zinc-950"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={sending || !revisionText.trim()}
                    onClick={() => void clientAction("revision")}
                    className="border-zinc-700"
                  >
                    Demander une modification
                  </Button>
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendTextMessage();
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message au tatoueur…"
                  disabled={sending}
                  className="border-zinc-800 bg-zinc-950"
                />
                <Button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{ backgroundColor: COBALT }}
                  className="shrink-0 text-white hover:opacity-90"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({
  message,
  role,
}: {
  message: SketchMessage;
  role: "pro" | "client";
}) {
  const isMine =
    (role === "pro" && message.sender_role === "pro") ||
    (role === "client" && message.sender_role === "client");

  const time = new Date(message.created_at).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
          isMine
            ? "bg-[#0057FF]/20 text-zinc-100"
            : "border border-zinc-800 bg-zinc-900 text-zinc-200",
        )}
      >
        <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          {message.sender_role === "pro" ? "Tatoueur" : "Client"} · {time}
        </p>
        {message.message && (
          <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
        )}
        {message.image_url && (
          <div className="mt-2">
            {isSketchImageUrl(message.image_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.image_url}
                alt="Croquis"
                className="max-h-64 rounded-lg border border-zinc-800 object-contain"
              />
            ) : (
              <a
                href={message.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#0057FF] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir le fichier
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
