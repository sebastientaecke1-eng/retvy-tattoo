import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { Button } from "@/components/ui/button";
import { MapPin, Palette } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InkProfilePage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === "demo") {
    return <DemoProfile />;
  }

  const profile = await fetchPublicProProfileBySlug(slug);

  if (!profile?.artist_name) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-zinc-900 text-4xl font-bold text-amber-400">
          {profile.artist_name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{profile.artist_name}</h1>
          {profile.studio && (
            <p className="mt-1 text-lg text-zinc-400">{profile.studio}</p>
          )}
          {profile.city && (
            <p className="mt-2 flex items-center gap-2 text-zinc-500">
              <MapPin className="h-4 w-4 text-amber-400" />
              {profile.city}
            </p>
          )}
          {profile.bio && (
            <p className="mt-6 leading-relaxed text-zinc-300">{profile.bio}</p>
          )}
          {profile.styles && profile.styles.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {profile.styles.map((style) => (
                <span
                  key={style}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300"
                >
                  <Palette className="h-3 w-3 text-amber-500" />
                  {style}
                </span>
              ))}
            </div>
          )}
          {(profile.price_min != null || profile.price_max != null) && (
            <p className="mt-4 text-sm text-zinc-500">
              Fourchette : {profile.price_min ?? "—"}€ – {profile.price_max ?? "—"}
              €
            </p>
          )}
          <div className="mt-10">
            <Button size="lg">Demander un devis</Button>
          </div>
        </div>
      </div>
      <p className="mt-12 text-center text-sm text-zinc-600">
        <Link href="/" className="text-amber-400 hover:underline">
          ← Retour à Retvy
        </Link>
      </p>
    </div>
  );
}

function DemoProfile() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-center text-sm text-amber-400">
        Profil de démonstration — exemple /ink/demo
      </p>
      <h1 className="text-3xl font-bold">Alex Ink</h1>
      <p className="mt-1 text-zinc-400">Black Gold Tattoo · Lyon</p>
      <p className="mt-6 text-zinc-300">
        Spécialiste japonais et blackwork — page exemple avant publication
        d&apos;un vrai profil.
      </p>
    </div>
  );
}
