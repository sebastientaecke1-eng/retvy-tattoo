"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { TattooFinderAnswers, TattooFinderArtist } from "@/lib/home/tattoo-finder";
import { styleIdToLabel } from "@/lib/home/tattoo-finder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TattooFinderMap = dynamic(
  () =>
    import("@/components/home/tattoo-finder-map").then((m) => m.TattooFinderMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-zinc-800 bg-[#0A0A0A] text-sm text-zinc-500">
        Chargement de la carte…
      </div>
    ),
  },
);

type Props = {
  artists: TattooFinderArtist[];
  answers: TattooFinderAnswers;
  onReset: () => void;
};

export function TattooFinderResults({ artists, answers, onReset }: Props) {
  if (artists.length === 0) {
    return (
      <div className="mt-6 space-y-6 animate-in fade-in duration-500">
        <div className="rounded-2xl border border-zinc-800 bg-[#0A0A0A] p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-[#0057FF]">
            Résultats
          </p>
          <h2 className="mt-2 text-xl font-bold text-zinc-100">
            Aucun tatoueur Retvy dans cette ville pour l&apos;instant.
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

  return (
    <div className="mt-6 space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#0057FF]">
            Résultats
          </p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-100">
            {artists.length} tatoueur{artists.length > 1 ? "s" : ""} à{" "}
            {answers.city}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {answers.style} · {answers.budget}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Nouvelle recherche
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="space-y-4">
          {artists.map((artist) => (
            <li key={artist.slug}>
              <ArtistCard artist={artist} />
            </li>
          ))}
        </ul>

        <div className="min-h-[320px] lg:min-h-[480px]">
          <TattooFinderMap
            artists={artists}
            className="h-full min-h-[320px] w-full rounded-2xl border border-zinc-800 lg:min-h-[480px]"
          />
        </div>
      </div>
    </div>
  );
}

function ArtistCard({ artist }: { artist: TattooFinderArtist }) {
  const imageSrc =
    artist.avatar_url ??
    "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80";

  return (
    <Card className="overflow-hidden border-zinc-800 bg-[#0A0A0A]">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
          <Image
            src={imageSrc}
            alt={artist.artist_name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <CardContent className="flex flex-1 flex-col justify-center p-0">
          <h3 className="font-semibold text-zinc-100">{artist.artist_name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0057FF]" />
            {[artist.studio, artist.city].filter(Boolean).join(" · ")}
          </p>
          {artist.styles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {artist.styles.slice(0, 4).map((styleId) => (
                <span
                  key={styleId}
                  className={cn(
                    "rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400",
                  )}
                >
                  {styleIdToLabel(styleId)}
                </span>
              ))}
            </div>
          )}
          <Link href={`/ink/${artist.slug}`} className="mt-3 inline-block w-fit">
            <Button size="sm" variant="outline">
              Voir le profil
            </Button>
          </Link>
        </CardContent>
      </div>
    </Card>
  );
}
