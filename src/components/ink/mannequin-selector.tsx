"use client";

/**
 * MannequinSelector — sélecteur 3D de zone corporelle
 * Embed le mannequin 3D via iframe et écoute les postMessages pour récupérer les zones sélectionnées.
 * Utilisé dans InkBookingFlow quand l'IA appelle l'outil show_body_selector.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

interface MannequinSelectorProps {
  /** Appelé quand le client confirme sa sélection de zones */
  onZonesSelected: (zones: string[]) => void;
  /** Sexe du mannequin (pour l'instant seul "male" est disponible) */
  gender?: "male" | "female";
}

export function MannequinSelector({
  onZonesSelected,
  gender = "male",
}: MannequinSelectorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Écoute les messages postMessage depuis l'iframe mannequin
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === "retvy-zones-selected" &&
        Array.isArray(event.data.zones) &&
        event.data.zones.length > 0
      ) {
        onZonesSelected(event.data.zones as string[]);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onZonesSelected]);

  // Le src dépend du genre — pour l'instant un seul modèle
  const src = gender === "female" ? "/mannequin3d-female.html" : "/mannequin3d-male.html";

  function handleReset() {
    // Recharge l'iframe pour réinitialiser la sélection
    if (iframeRef.current) {
      iframeRef.current.src = src;
      setLoaded(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-blue-500/20 bg-zinc-950">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Sélectionner la zone du tatouage
        </span>
        <div className="flex items-center gap-2">
          {/* Choix genre */}
          <div className="flex gap-1 text-[10px]">
            <button
              className={`rounded px-2 py-0.5 ${gender === "male" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              disabled
            >
              Homme
            </button>
            <button
              className="rounded px-2 py-0.5 text-zinc-600 cursor-not-allowed"
              title="Disponible prochainement"
              disabled
            >
              Femme
            </button>
          </div>
          <button
            onClick={handleReset}
            className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Iframe mannequin 3D */}
      <div className="relative" style={{ height: 420 }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du modèle 3D…
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          title="Sélecteur de zone corporelle"
          sandbox="allow-scripts"
        />
      </div>


    </div>
  );
}
