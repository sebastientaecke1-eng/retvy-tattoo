"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PersonalLinkSectionProps = {
  slug: string;
};

const appUrl = "https://retvy.fr";

export function PersonalLinkSection({ slug }: PersonalLinkSectionProps) {
  const publicUrl = `${appUrl}/ink/${slug}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!canvasRef.current) return;

      try {
        await QRCode.toCanvas(canvasRef.current, publicUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: "#f59e0b",
            light: "#09090b",
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

    return () => {
      cancelled = true;
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

  const handleDownloadQr = useCallback(async () => {
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: "#f59e0b",
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
            <p className="mt-3 break-all text-xl font-semibold text-amber-400 md:text-2xl">
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

            <Link href={`/ink/${slug}`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline">
                <ExternalLink className="h-4 w-4" />
                Voir mon profil public
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              QR Code
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              À afficher en studio ou sur vos supports print.
            </p>
          </div>

          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
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
    </div>
  );
}
