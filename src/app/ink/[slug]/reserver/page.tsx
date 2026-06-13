import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { InkBookingFlow } from "@/components/ink/ink-booking-flow";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function InkReserverPage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === "demo") {
    notFound();
  }

  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.artist_name) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/ink/${slug}`}
        className="text-sm text-zinc-500 hover:text-blue-400"
      >
        ← Retour au profil
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-zinc-50">
        Demander un devis
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Assistant IA · {profile.artist_name}
        {profile.studio ? ` · ${profile.studio}` : ""}
      </p>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80">
              <div className="h-8 w-8 animate-pulse rounded-full bg-blue-500/30" />
            </div>
          }
        >
          <InkBookingFlow slug={slug} artistName={profile.artist_name} />
        </Suspense>
      </div>
    </div>
  );
}
