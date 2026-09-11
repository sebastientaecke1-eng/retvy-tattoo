"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect } from "react";
import type { TattooFinderAnswers, TattooFinderArtist } from "@/lib/home/tattoo-finder";
import { Button } from "@/components/ui/button";

const TattooFinderMap = dynamic(
  () =>
    import("@/components/home/tattoo-finder-map").then((m) => m.TattooFinderMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0d1117] text-sm text-zinc-500">
        Chargement de la carte…
      </div>
    ),
  },
);

type Props = {
  artists: TattooFinderArtist[];
  answers: TattooFinderAnswers;
  fallback?: boolean;
  onReset: () => void;
};

export function TattooFinderResults({ artists, answers, fallback = false, onReset }: Props) {
  // Lock body scroll while the fullscreen map is shown
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (artists.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1117]">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0A0A0A] p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-[#0057FF]">
            Résultats
          </p>
          <h2 className="mt-2 text-xl font-bold text-zinc-100">
            {answers.city
              ? "Aucun tatoueur Retvy dans cette ville pour l'instant."
              : "Aucun tatoueur Retvy pour ces critères pour l'instant."}
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Vous pouvez quand même parcourir tous nos artistes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="outline" onClick={onReset}>
              Modifier ma recherche
            </Button>
            <Link href="/">
              <Button type="button">Parcourir les artistes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resultLabel =
    artists.length === 1
      ? `1 tatoueur${answers.city ? ` · ${answers.city}` : ""}`
      : `${artists.length} tatoueurs${answers.city ? ` · ${answers.city}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117]">
      {/* ── Map fills the full overlay ── */}
      <TattooFinderMap
        artists={artists}
        city={answers.city}
        className="h-full w-full"
      />

      {/* ── Floating top bar ── */}
      <div
        className="pointer-events-auto absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 px-4 py-2.5 shadow-lg"
        style={{ background: "rgba(13,17,23,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4"/>
          </svg>
          Nouvelle recherche
        </button>

        <div className="h-4 w-px bg-white/10" />

        <span className="whitespace-nowrap text-sm font-semibold text-zinc-100">
          {resultLabel}
        </span>

        {answers.familySlug && (
          <span
            className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ color: "#3060ff", background: "rgba(48,96,255,0.12)", borderColor: "rgba(48,96,255,0.25)" }}
          >
            {answers.familyLabel}
          </span>
        )}
      </div>

      {/* ── Fallback banner ── */}
      {fallback && answers.city && (
        <div
          className="pointer-events-auto absolute left-1/2 top-20 z-10 flex w-[min(90vw,420px)] -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm shadow-lg backdrop-blur"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-amber-300">
            Aucun tatoueur Retvy à <strong>{answers.city}</strong> — voici les artistes les plus proches.
          </span>
        </div>
      )}

      {/* ── Bottom count pill ── */}
      <div
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 px-5 py-2 text-sm shadow-lg"
        style={{ background: "rgba(13,17,23,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <span className="text-zinc-400">
          <strong className="text-zinc-100">{artists.length}</strong>{" "}
          résultat{artists.length > 1 ? "s" : ""} · zone visible
        </span>
      </div>
    </div>
  );
}
