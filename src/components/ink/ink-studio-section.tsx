import Link from "next/link";
import { MapPin } from "lucide-react";
import { InkStudioPhotoGrid } from "@/components/ink/ink-studio-photo-grid";
import type { PublicStudioPhoto } from "@/lib/pro/public-profile";
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsOpenUrl,
  formatCityPostal,
  formatStudioAddress,
  hasStudioSection,
  type StudioLocationFields,
} from "@/lib/pro/studio";

type Props = StudioLocationFields & {
  photos: PublicStudioPhoto[];
};

export function InkStudioSection({
  studio,
  address,
  city,
  postal_code,
  photos,
}: Props) {
  const fields = { studio, address, city, postal_code };
  const cityLine = formatCityPostal(city, postal_code);
  if (!hasStudioSection(fields, photos.length)) {
    return null;
  }

  const mapsEmbedUrl = buildGoogleMapsEmbedUrl(fields);
  const mapsOpenUrl = buildGoogleMapsOpenUrl(fields);
  const addressLine = formatStudioAddress(fields);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-zinc-100">Le studio</h2>

      <div className="mt-6 rounded-2xl border border-zinc-800/90 bg-zinc-950/60 p-5 shadow-sm sm:p-6">
        {mapsEmbedUrl && (
          <div className="relative h-[400px] overflow-hidden rounded-xl border border-zinc-800">
            <iframe
              title="Carte du studio"
              src={mapsEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
              aria-hidden
            >
              <MapPin
                className="h-11 w-11 fill-red-500 text-red-600 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                strokeWidth={1.5}
              />
            </div>
          </div>
        )}

        {(studio || addressLine) && (
          <div className={mapsEmbedUrl ? "mt-6" : ""}>
            {studio && (
              <p className="text-xl font-bold text-zinc-50">{studio}</p>
            )}
            {addressLine && (
              <p className="mt-2 flex items-start gap-2 text-base text-zinc-300">
                <span className="mt-0.5 shrink-0 text-lg leading-none" aria-hidden>
                  📍
                </span>
                <span>
                  {address && <span className="block">{address}</span>}
                  {cityLine && (
                    <span className={address ? "block text-zinc-400" : "block"}>
                      {cityLine}
                    </span>
                  )}
                </span>
              </p>
            )}
          </div>
        )}

        {mapsOpenUrl && (
          <Link
            href={mapsOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 sm:w-auto"
          >
            Ouvrir dans Google Maps
          </Link>
        )}

        <InkStudioPhotoGrid photos={photos} />
      </div>
    </section>
  );
}
