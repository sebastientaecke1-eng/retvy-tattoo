"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowRight,
  Check,
  Loader2,
  Paperclip,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { colorPreferenceLabel } from "@/lib/ink/color-preference";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/supabase/public-config";
import { styleLabel } from "@/lib/pro/public-profile";
import {
  normalizeSlotDate,
  normalizeSlotTime,
  sizeCategoryLabel,
} from "@/lib/pro/ink-booking";
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
  color_preference: "color" | "black_and_grey" | "undecided";
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

function buildBookPayload(
  intake: BookingIntakeResult,
  referenceUrl: string | null,
  referenceAnalysis: string | null,
) {
  const slot_date = normalizeSlotDate(intake.slot_date) ?? intake.slot_date;
  const slot_time = normalizeSlotTime(intake.slot_time) ?? intake.slot_time;

  return {
    style: intake.style,
    zone: intake.zone,
    size: intake.size,
    size_category: intake.size_category,
    budget: intake.budget,
    slot_date,
    slot_time,
    duration_minutes: intake.duration_minutes,
    client_name: intake.client_name,
    client_email: intake.client_email,
    client_phone: intake.client_phone,
    project_description: intake.project_description,
    reference_image_url: intake.reference_image_url ?? referenceUrl,
    reference_note: intake.reference_note ?? referenceAnalysis,
    color_preference: intake.color_preference,
  };
}

export function InkBookingFlow({ slug, artistName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const cancelled = searchParams.get("cancel") === "1";

  const [input, setInput] = useState("");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceAnalysis, setReferenceAnalysis] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [deferring, setDeferring] = useState(false);
  const [deferSuccess, setDeferSuccess] = useState(false);
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
    if (file.size > 5 * 1024 * 1024) {
      setPayError("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setReferenceUploading(true);
    setPayError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/ink/${slug}/reference`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        url?: string;
        analysis?: string | null;
        error?: string;
      };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Échec upload");
      setReferenceUrl(data.url);
      setReferenceAnalysis(data.analysis?.trim() || null);

      const intro = data.analysis
        ? `J'ai ajouté une photo de référence. Analyse : ${data.analysis}`
        : "J'ai ajouté une photo de référence pour mon projet.";

      sendMessage({
        parts: [
          { type: "text", text: intro },
          {
            type: "file",
            url: data.url,
            mediaType: file.type || "image/jpeg",
          },
        ],
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
      const payload = buildBookPayload(intake, referenceUrl, referenceAnalysis);

      const prepRes = await fetch(`/api/ink/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const prep = (await prepRes.json()) as {
        deposit?: number;
        reference?: string;
        error?: string;
      };
      if (!prepRes.ok || prep.deposit == null || !prep.reference) {
        throw new Error(prep.error ?? "Créneau ou données invalides");
      }

      const functionsBase = getPublicSupabaseUrl().replace(/\/$/, "");
      const checkoutRes = await fetch(
        `${functionsBase}/functions/v1/stripe-deposit`,
        {
          method: "POST",
          headers: {
            apikey: getPublicSupabaseAnonKey(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingData: payload,
            proSlug: slug,
            depositAmount: prep.deposit,
            reference: prep.reference,
          }),
        },
      );
      const data = (await checkoutRes.json()) as {
        url?: string;
        error?: string;
      };
      if (!checkoutRes.ok || !data.url) {
        throw new Error(data.error ?? "Impossible de lancer le paiement");
      }
      window.location.href = data.url;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erreur paiement");
      setPaying(false);
    }
  }

  async function payLater() {
    if (!intake) return;
    setDeferring(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/ink/${slug}/book/defer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBookPayload(intake, referenceUrl, referenceAnalysis)),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Impossible de réserver");
      }
      setDeferSuccess(true);
      setDeferring(false);
      window.setTimeout(() => {
        router.push("/client/dashboard?booking=deferred");
      }, 2000);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erreur réservation");
      setDeferring(false);
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
        <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          Paiement annulé — vous pouvez reprendre la conversation ou modifier le créneau.
        </p>
      )}

      <Card className="overflow-hidden border-blue-500/20 bg-zinc-950/90">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-200">
                Réservation avec {artistName}
              </span>
            </div>
            {!intake && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-blue-500/40 hover:text-blue-300">
                {referenceUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                Photo de référence
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  disabled={referenceUploading || isLoading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadReference(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {referenceUrl && !intake && (
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-700">
                <Image
                  src={referenceUrl}
                  alt="Référence"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="text-xs text-zinc-500">
                Photo de référence ajoutée
                {referenceAnalysis ? " — l'assistant l'analyse pour affiner le projet." : "."}
              </p>
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex max-h-[min(480px,65vh)] min-h-[360px] flex-col space-y-4 overflow-y-auto p-4"
          >
            {visibleMessages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const hasImage = m.parts.some(
                (p) =>
                  p.type === "file" &&
                  "mediaType" in p &&
                  typeof p.mediaType === "string" &&
                  p.mediaType.startsWith("image/") &&
                  "url" in p &&
                  typeof p.url === "string",
              );
              const imageUrl = m.parts.find(
                (p) =>
                  p.type === "file" &&
                  "url" in p &&
                  typeof p.url === "string",
              );
              if (!text.trim() && !hasImage) return null;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-blue-500/15 text-blue-50"
                      : "bg-zinc-900 text-zinc-300",
                  )}
                >
                  {hasImage &&
                    imageUrl &&
                    "url" in imageUrl &&
                    typeof imageUrl.url === "string" && (
                      <div className="relative mb-2 h-32 w-full overflow-hidden rounded-lg border border-zinc-700">
                        <Image
                          src={imageUrl.url}
                          alt="Référence"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                  {text.trim() ? text : "Photo de référence"}
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
                {error.message ? (
                  <span className="mt-1 block text-xs text-red-400/80">
                    {error.message}
                  </span>
                ) : null}
              </p>
            )}
          </div>

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
                className="flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-black hover:bg-blue-400 disabled:opacity-30"
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
        <Card className="border-blue-500/30 bg-zinc-950/90">
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
                label="Couleur"
                value={colorPreferenceLabel(intake.color_preference)}
              />
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
            {(intake.reference_image_url ?? referenceUrl) && (
              <div className="relative aspect-video max-w-xs overflow-hidden rounded-xl border border-zinc-800">
                <Image
                  src={intake.reference_image_url ?? referenceUrl ?? ""}
                  alt="Référence"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-blue-500/80">
                Acompte à régler
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {intake.deposit_amount} €
              </p>
            </div>
            {!intake.slot_available && (
              <p className="text-sm text-blue-300">
                Attention : le créneau choisi pourrait ne plus être disponible. Le
                paiement sera refusé si le créneau est pris entre-temps.
              </p>
            )}
            {deferSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Votre RDV est réservé. Le tatoueur a été notifié. Pensez à
                régler l&apos;acompte avant votre RDV. Redirection vers votre
                espace client…
              </div>
            )}
            {payError && (
              <p className="text-sm text-red-400">{payError}</p>
            )}
            {!deferSuccess && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="w-full sm:flex-1"
                  disabled={paying || deferring}
                  onClick={() => void payDeposit()}
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirection Stripe…
                    </>
                  ) : (
                    `Payer l'acompte — ${intake.deposit_amount} €`
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:flex-1"
                  disabled={paying || deferring}
                  onClick={() => void payLater()}
                >
                  {deferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Réservation…
                    </>
                  ) : (
                    "Payer plus tard"
                  )}
                </Button>
              </div>
            )}
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
