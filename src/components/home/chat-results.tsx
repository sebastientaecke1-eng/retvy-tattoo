import Link from "next/link";
import Image from "next/image";
import type { MatchResult } from "@/lib/artists";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatPriceRange(
  priceMin: number | null,
  priceMax: number | null,
): string | null {
  if (priceMin != null && priceMax != null) {
    return `${priceMin}€ – ${priceMax}€`;
  }
  if (priceMin != null) return `À partir de ${priceMin}€`;
  if (priceMax != null) return `Jusqu'à ${priceMax}€`;
  return null;
}

function searchScopeLabel(
  scope: MatchResult["searchScope"],
  maxDistanceKm?: number | null,
): string | null {
  if (scope === "department") {
    return maxDistanceKm
      ? `Recherche élargie (~${maxDistanceKm} km) — profils dans le même département.`
      : "Profils dans le même département.";
  }
  if (scope === "neighbors") {
    return maxDistanceKm
      ? `Recherche élargie (~${maxDistanceKm} km) — département et environs proches.`
      : "Profils dans les départements voisins.";
  }
  if (scope === "region") {
    return maxDistanceKm
      ? `Recherche élargie (~${maxDistanceKm} km) — région élargie.`
      : "Profils dans la même région.";
  }
  return null;
}

export function ChatResults({ result }: { result: MatchResult }) {
  const {
    artists,
    priceEstimate,
    summary,
    noArtistsFound,
    needsTravelRadius,
    searchScope,
  } = result;

  if (needsTravelRadius) {
    return null;
  }

  if (noArtistsFound || artists.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center animate-in fade-in duration-500">
        <p className="text-xs uppercase tracking-widest text-amber-500">
          Résultats
        </p>
        <h2 className="mt-2 text-xl font-bold text-zinc-100">
          Aucun professionnel disponible
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Nous n&apos;avons trouvé aucun tatoueur Retvy correspondant à votre
          projet ({summary.style} · {summary.city} · budget {summary.budget}
          €) pour le moment.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Revenez bientôt — de nouveaux artistes rejoignent la plateforme
          régulièrement.
        </p>
      </div>
    );
  }

  const scopeHint = searchScopeLabel(
    searchScope,
    summary.maxDistanceKm,
  );

  return (
    <div className="mt-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-500">
            Résultats
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Vos matchs à {summary.city}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {summary.style} · {summary.bodyZone} · {summary.size}
          </p>
          {scopeHint && (
            <p className="mt-2 text-sm text-amber-400/90">{scopeHint}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Estimation</p>
          <p className="text-2xl font-bold text-amber-400">
            {priceEstimate.min}€ – {priceEstimate.max}€
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {artists.map((a) => {
          const priceRange = formatPriceRange(a.priceMin, a.priceMax);
          return (
            <Card key={a.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-zinc-900">
                <Image
                  src={a.image}
                  alt={a.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{a.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {a.studio} · {a.city}
                    </p>
                  </div>
                  {priceRange && (
                    <span className="shrink-0 text-xs text-zinc-400">
                      {priceRange}
                    </span>
                  )}
                </div>
                {a.bio && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                    {a.bio}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {a.styles.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <Link href={a.profileUrl} className="mt-4 inline-block">
                  <Button size="sm" variant="outline">
                    Voir le profil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-zinc-500">
        <Link
          href="/inscription-client"
          className="text-amber-400 hover:underline"
        >
          Créer un compte
        </Link>{" "}
        pour sauvegarder votre projet et réserver.
      </p>
    </div>
  );
}
