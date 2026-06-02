import Link from "next/link";
import Image from "next/image";
import type { MatchResult } from "@/lib/artists";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ChatResults({ result }: { result: MatchResult }) {
  const { artists, priceEstimate, summary } = result;

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
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Estimation</p>
          <p className="text-2xl font-bold text-amber-400">
            {priceEstimate.min}€ – {priceEstimate.max}€
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {artists.map((a) => (
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
                  <p className="text-sm text-zinc-500">{a.studio}</p>
                </div>
                <span className="text-xs text-zinc-500">{a.priceMin}€+</span>
              </div>
              {a.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{a.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {a.styles.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <Link href={`/ink/${a.slug}`} className="mt-4 inline-block">
                <Button size="sm" variant="outline">
                  Voir le profil
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/inscription-client" className="text-amber-400 hover:underline">
          Créer un compte
        </Link>{" "}
        pour sauvegarder votre projet et réserver.
      </p>
    </div>
  );
}
