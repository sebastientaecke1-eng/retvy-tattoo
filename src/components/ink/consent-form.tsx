"use client";

/**
 * ConsentForm — Formulaire de consentement électronique tatouage
 * Affiche le texte légal standard + canvas de signature.
 * Appelle onSigned({ consentId, signerName }) une fois la signature validée.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2, Eraser, PenLine } from "lucide-react";

interface ConsentFormProps {
  slug: string;
  clientName: string;
  clientEmail: string;
  onSigned: (data: { consentId: string; signerName: string; signaturePreview: string }) => void;
}

const CONSENT_TEXT = `En signant ce formulaire, je déclare et confirme ce qui suit :

1. Majorité — Je certifie être âgé(e) d'au moins 18 ans révolus. Je reconnais qu'il est interdit de réaliser un tatouage sur une personne mineure.

2. État de santé — Je confirme que je ne souffre d'aucune contre-indication médicale connue susceptible de compromettre la cicatrisation ou de présenter un risque pour ma santé lors de la réalisation du tatouage (notamment : troubles de la coagulation, immunodépression, diabète non équilibré, allergie aux encres ou aux produits désinfectants, maladies de peau évolutives, traitements anticoagulants, grossesse ou allaitement). En cas de doute, j'ai consulté mon médecin.

3. Consentement éclairé — J'ai été informé(e) des risques inhérents à la pratique du tatouage : réactions allergiques aux pigments, infections, cicatrisation anormale (chéloïdes), modification de l'aspect au fil du temps. Je confirme avoir eu l'occasion de poser toutes mes questions et d'obtenir des réponses satisfaisantes.

4. Caractère permanent — Je comprends que le tatouage est une modification corporelle permanente. J'ai mûrement réfléchi à mon projet et je confirme ma décision de façon libre et éclairée.

5. Suivi des soins — Je m'engage à suivre les instructions de soin post-tatouage communiquées par l'artiste afin de favoriser une cicatrisation optimale.

6. Droit à l'image — J'autorise l'artiste à photographier le tatouage réalisé à des fins de documentation artistique et de communication professionnelle, dans le respect de ma vie privée (publication sans visage ou avec mon accord exprès).

7. Annulation de rendez-vous — Je reconnais avoir pris connaissance de la politique d'annulation applicable à cette réservation.

En signant ci-dessous, je confirme avoir lu, compris et accepté l'intégralité du présent formulaire de consentement.`;

export function ConsentForm({ slug, clientName, clientEmail, onSigned }: ConsentFormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState(clientName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0057FF";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    lastPos.current = getPos(e);
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasStrokes(true);
    }
    lastPos.current = pos;
  }

  function onPointerUp() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }, []);

  async function handleSign() {
    if (!hasStrokes || !signerName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const canvas = canvasRef.current!;
      const signature = canvas.toDataURL("image/png");

      const res = await fetch(`/api/ink/${slug}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: clientEmail,
          signer_name: signerName.trim(),
          signature,
        }),
      });
      const data = await res.json() as { ok?: boolean; consent_id?: string; error?: string };
      if (!res.ok || !data.consent_id) {
        throw new Error(data.error ?? "Erreur lors de l'enregistrement");
      }
      setSigned(true);
      onSigned({ consentId: data.consent_id, signerName: signerName.trim(), signaturePreview: signature });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  if (signed) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-200">Consentement signé</p>
          <p className="text-xs text-emerald-400 mt-0.5">Signé par <strong>{signerName}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-5 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Formulaire de consentement
        </h3>
      </div>

      {/* Texte légal */}
      <div
        className="max-h-48 overflow-y-auto px-5 py-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
        style={{ scrollbarWidth: "thin" }}
      >
        {CONSENT_TEXT.split("\n\n").map((para, i) => (
          <p key={i} className="mb-2 last:mb-0">{para}</p>
        ))}
      </div>

      {/* Champ nom */}
      <div className="px-5 pb-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Nom complet du signataire
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Prénom NOM"
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* Zone de signature */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Signature
          </label>
          {hasStrokes && (
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <Eraser className="h-3 w-3" />
              Effacer
            </button>
          )}
        </div>
        <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="w-full cursor-crosshair touch-none"
            style={{ height: 100 }}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-zinc-300 select-none">
                Tracez votre signature ici
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="px-5 pb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Bouton signer */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={() => void handleSign()}
          disabled={!hasStrokes || !signerName.trim() || saving}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Enregistrement…" : "Je signe et confirme le formulaire →"}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-400">
          En signant, je certifie avoir lu et accepté le formulaire de consentement ci-dessus.
        </p>
      </div>
    </div>
  );
}
