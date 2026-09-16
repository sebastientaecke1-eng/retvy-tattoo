"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PersonalLinkSectionProps = {
  slug: string;
  studioSlug?: string;
  referralCode?: string | null;
};

const appUrl = "https://retvy.fr";
const QR_COLOR_DARK = "#0057FF";

export function PersonalLinkSection({ slug, studioSlug, referralCode }: PersonalLinkSectionProps) {
  // For multi-profile accounts with a studio slug, the main link is the studio page
  const publicUrl = studioSlug ? `${appUrl}/studio/${studioSlug}` : `${appUrl}/ink/${slug}`;
  const profileUrl = `${appUrl}/ink/${slug}`;
  const referralLink = referralCode ? `${appUrl}/pro/inscription?ref=${referralCode}` : null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function isDarkTheme() {
      return document.documentElement.classList.contains("dark");
    }

    void (async () => {
      if (!canvasRef.current) return;

      try {
        await QRCode.toCanvas(canvasRef.current, publicUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: QR_COLOR_DARK,
            light: isDarkTheme() ? "#09090b" : "#ffffff",
          },
        });
        if (!cancelled) {
          setQrReady(true);
          setQrError(null);
        }
      } catch {
        if (!cancelled) {
          setQrError("Impossible de générer le QR code.");
        }
      }
    })();

    const observer = new MutationObserver(() => {
      if (!canvasRef.current || cancelled) return;
      void QRCode.toCanvas(canvasRef.current, publicUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: QR_COLOR_DARK,
          light: document.documentElement.classList.contains("dark")
            ? "#09090b"
            : "#ffffff",
        },
      }).catch(() => {});
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [publicUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [publicUrl]);

  const handleCopyReferral = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      setCopiedReferral(false);
    }
  }, [referralLink]);

  const handleDownloadQr = useCallback(async () => {
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: QR_COLOR_DARK,
          light: "#ffffff",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `retvy-${slug}-qr.png`;
      link.click();
    } catch {
      setQrError("Impossible de télécharger le QR code.");
    }
  }, [publicUrl, slug]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mon lien perso</h1>
        <p className="mt-1 text-zinc-500">
          Partagez ce lien pour que vos clients accèdent à votre profil et
          réservent en ligne.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Votre lien public
            </p>
            <p className="mt-3 break-all text-xl font-semibold text-blue-400 md:text-2xl">
              {publicUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleCopy()}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier le lien
                </>
              )}
            </Button>

            <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline">
                <ExternalLink className="h-4 w-4" />
                {studioSlug ? "Voir ma page studio" : "Voir mon profil public"}
              </Button>
            </Link>
            {studioSlug && (
              <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline">
                  <ExternalLink className="h-4 w-4" />
                  Voir mon profil artiste
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              QR Code
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              À afficher en studio ou sur vos supports print.
            </p>
          </div>

          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <canvas
                ref={canvasRef}
                className={qrReady ? "block" : "hidden"}
                aria-label={`QR code vers ${publicUrl}`}
              />
              {!qrReady && !qrError && (
                <div className="flex h-[240px] w-[240px] items-center justify-center text-sm text-zinc-500">
                  Génération…
                </div>
              )}
              {qrError && (
                <p className="text-sm text-red-400">{qrError}</p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDownloadQr()}
              disabled={!qrReady}
            >
              <Download className="h-4 w-4" />
              Télécharger le QR code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Section parrainage ─────────────────────────────────── */}
      {referralCode && referralLink && (
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Parrainage
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Invitez un confrère — il bénéficie d&apos;un mois offert, vous aussi.
                </p>
              </div>
            </div>

            {/* Code */}
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">
                Votre code
              </p>
              <p className="font-mono text-2xl font-bold tracking-wider text-blue-600 dark:text-blue-400">
                {referralCode}
              </p>
            </div>

            {/* Lien */}
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-400 mb-2">
                Lien de parrainage
              </p>
              <p className="break-all text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                {referralLink}
              </p>
              <Button type="button" variant="outline" onClick={() => void handleCopyReferral()}>
                {copiedReferral ? (
                  <>
                    <Check className="h-4 w-4" />
                    Lien copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier le lien
                  </>
                )}
              </Button>
            </div>

            {/* Avantages */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Gift className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span><strong>Vous</strong> : 1 mois offert dès que votre filleul souscrit</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Gift className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span><strong>Votre filleul</strong> : 1 mois gratuit en plus (promo ou abonnement normal)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Aperçu de votre profil public
            </h2>
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                Voir en plein écran
              </Button>
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <iframe
              src={publicUrl}
              title={`Aperçu du profil public — ${studioSlug ?? slug}`}
              className="h-[600px] w-full border-0 bg-white dark:bg-zinc-950"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
