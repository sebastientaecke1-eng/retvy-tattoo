import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { InkPortfolioGallery } from "@/components/ink/ink-portfolio-gallery";
import { InkStudioSection } from "@/components/ink/ink-studio-section";
import {
  fetchPublicPortfolioByUserId,
  fetchPublicProProfileBySlug,
  fetchPublicStudioPhotosByUserId,
  groupPortfolioByStyle,
  styleLabel,
} from "@/lib/pro/public-profile";
import { Button } from "@/components/ui/button";
import { formatCityPostal } from "@/lib/pro/studio";
import { MapPin, Palette } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function InkProfilePage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === "demo") {
    return <DemoProfile />;
  }

  const profile = await fetchPublicProProfileBySlug(slug);

  if (!profile?.artist_name) {
    notFound();
  }

  const portfolioItems = profile.user_id
    ? await fetchPublicPortfolioByUserId(profile.user_id)
    : [];

  const portfolioGroups = groupPortfolioByStyle(
    portfolioItems,
    profile.styles,
  );

  const studioPhotos = profile.user_id
    ? await fetchPublicStudioPhotosByUserId(profile.user_id)
    : [];

  const cityLine = formatCityPostal(profile.city, profile.postal_code);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="relative mx-auto h-48 w-48 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-500/20 to-zinc-900 md:mx-0">
          {profile.avatar_url ? (
            <Image
              key={profile.avatar_url}
              src={profile.avatar_url}
              alt={profile.artist_name}
              fill
              className="object-cover"
              sizes="192px"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-bold text-blue-400">
              {profile.artist_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-zinc-50">
            {profile.artist_name}
          </h1>
          {profile.studio && (
            <p className="mt-1 text-lg text-zinc-400">{profile.studio}</p>
          )}
          {cityLine && (
            <p className="mt-2 flex items-center justify-center gap-2 text-zinc-500 md:justify-start">
              <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
              {cityLine}
            </p>
          )}
          {profile.styles && profile.styles.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
              {profile.styles.map((style) => (
                <span
                  key={style}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300"
                >
                  <Palette className="h-3 w-3 text-blue-500" />
                  {styleLabel(style)}
                </span>
              ))}
            </div>
          )}
          {profile.bio && (
            <p className="mt-6 leading-relaxed text-zinc-300">{profile.bio}</p>
          )}
          {(profile.price_min != null || profile.price_max != null) && (
            <p className="mt-4 text-sm text-zinc-500">
              Fourchette : {profile.price_min ?? "—"}€ – {profile.price_max ?? "—"}
              €
            </p>
          )}
          <div className="mt-10 flex justify-center md:justify-start">
            <Link href={`/ink/${slug}/reserver`}>
              <Button size="lg">Demander un devis</Button>
            </Link>
          </div>
        </div>
      </div>

      <InkPortfolioGallery groups={portfolioGroups} />

      <InkStudioSection
        studio={profile.studio}
        address={profile.address}
        city={profile.city}
        postal_code={profile.postal_code}
        photos={studioPhotos}
      />

      <p className="mt-12 text-center text-sm text-zinc-600">
        <Link href="/" className="text-blue-400 hover:underline">
          ← Retour à Retvy
        </Link>
      </p>
    </div>
  );
}

function DemoProfile() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2 text-center text-sm text-blue-400">
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
