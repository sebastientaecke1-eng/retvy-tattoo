"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { styleLabel } from "@/lib/pro/public-profile";
import { sizeCategoryLabel } from "@/lib/pro/ink-booking";
import type { CancellationPolicy } from "@/lib/pro/deposit-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BookingIntakeResult = {
  artist_name: string;
  artist_slug: string;
  style: string;
  zone: string;
  size: string;
  size_category: "small" | "medium" | "large";
  budget: number;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  reference_note: string | null;
  reference_image_url: string | null;
  project_description: string;
  price_estimate: { min: number; max: number };
  deposit_amount: number;
  cancellation_policy: CancellationPolicy;
  slot_available: boolean;
};

type Props = {
  slug: string;
  artistName: string;
};

export function InkBookingFlow({ slug, artistName }: Props) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const cancelled = searchParams.get("cancel") === "1";

  const [input, setInput] = useState("");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/ink/${slug}/chat`,
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  let intake: BookingIntakeResult | null = null;
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (
        part.type === "tool-complete_booking_intake" &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        intake = part.output as BookingIntakeResult;
      }
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status, intake]);

  useEffect(() => {
    if (kickedOff.current || messages.length > 0 || success) return;
    if (status !== "ready") return;
    kickedOff.current = true;
    sendMessage({ text: "Bonjour, je souhaite demander un devis." });
  }, [messages.length, status, sendMessage, success]);

  async function uploadReference(file: File) {
    setReferenceUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/ink/${slug}/reference`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Échec upload");
      setReferenceUrl(data.url);
      sendMessage({
        text: `J'ai ajouté une image de référence : ${data.url}`,
      });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setReferenceUploading(false);
    }
  }

  async function payDeposit() {
    if (!intake) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/ink/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: intake.style,
          zone: intake.zone,
          size: intake.size,
          size_category: intake.size_category,
          budget: intake.budget,
          slot_date: intake.slot_date,
          slot_time: intake.slot_time,
          duration_minutes: intake.duration_minutes,
          client_name: intake.client_name,
          client_email: intake.client_email,
          client_phone: intake.client_phone,
          project_description: intake.project_description,
          reference_image_url: intake.reference_image_url ?? referenceUrl,
          reference_note: intake.reference_note,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Impossible de lancer le paiement");
      }
      window.location.href = data.url;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erreur paiement");
      setPaying(false);
    }
  }

  if (success) {
    return (
      <Card className="border-emerald-500/30 bg-zinc-950/90">
        <CardContent className="py-12 text-center">
          <Check className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="mt-4 text-2xl font-bold text-zinc-50">
            Réservation confirmée
          </h2>
          <p className="mt-2 text-zinc-400">
            Votre acompte a été reçu. Un email de confirmation vous a été envoyé.
          </p>
          <Link href={`/ink/${slug}`} className="mt-8 inline-block">
            <Button variant="outline">Retour au profil</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastText =
    lastAssistant?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ??
    "";
  const showReferenceUpload =
    !intake &&
    !isLoading &&
    /référence|image|photo/i.test(lastText);

  const visibleMessages = messages.filter(
    (m) =>
      !(
        m.role === "user" &&
        m.parts.length === 1 &&
        m.parts[0].type === "text" &&
        m.parts[0].text.includes("demander un devis") &&
        messages.indexOf(m) === 0
      ),
  );

  return (
    <div className="space-y-6">
      {cancelled && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Paiement annulé — vous pouvez reprendre la conversation ou modifier le créneau.
        </p>
      )}

      <Card className="overflow-hidden border-amber-500/20 bg-zinc-950/90">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">
              Réservation avec {artistName}
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex max-h-[min(480px,65vh)] min-h-[360px] flex-col space-y-4 overflow-y-auto p-4"
          >
            {visibleMessages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              if (!text.trim()) return null;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-amber-500/15 text-amber-50"
                      : "bg-zinc-900 text-zinc-300",
                  )}
                >
                  {text}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                L&apos;assistant réfléchit…
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                Une erreur est survenue. Réessayez.
              </p>
            )}
          </div>

          {showReferenceUpload && (
            <div className="border-t border-zinc-800 px-4 py-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
                {referenceUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Ajouter une image de référence (optionnel)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={referenceUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadReference(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {!intake && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = input.trim();
                if (!text || isLoading) return;
                sendMessage({ text });
                setInput("");
              }}
              className="flex gap-2 border-t border-zinc-800 p-4"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre réponse…"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30"
                aria-label="Envoyer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      {intake && (
        <Card className="border-amber-500/30 bg-zinc-950/90">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-zinc-50">
              Récapitulatif
            </h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <RecapRow label="Artiste" value={intake.artist_name} />
              <RecapRow label="Style" value={styleLabel(intake.style)} />
              <RecapRow label="Zone" value={intake.zone} />
              <RecapRow label="Taille" value={sizeCategoryLabel(intake.size_category)} />
              <RecapRow
                label="Créneau"
                value={`${intake.slot_date} à ${intake.slot_time} (${intake.duration_minutes} min)`}
              />
              <RecapRow label="Client" value={intake.client_name} />
              <RecapRow label="Email" value={intake.client_email} />
              <RecapRow label="Téléphone" value={intake.client_phone} />
              <RecapRow
                label="Estimation"
                value={`${intake.price_estimate.min}–${intake.price_estimate.max} €`}
              />
            </dl>
            <p className="text-sm text-zinc-400">{intake.project_description}</p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-amber-500/80">
                Acompte à régler
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {intake.deposit_amount} €
              </p>
            </div>
            {!intake.slot_available && (
              <p className="text-sm text-amber-300">
                Attention : le créneau choisi pourrait ne plus être disponible. Le
                paiement sera refusé si le créneau est pris entre-temps.
              </p>
            )}
            {payError && (
              <p className="text-sm text-red-400">{payError}</p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={paying}
              onClick={() => void payDeposit()}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirection Stripe…
                </>
              ) : (
                "Payer l'acompte"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
