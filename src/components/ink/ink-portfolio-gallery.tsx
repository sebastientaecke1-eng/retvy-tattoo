"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { PortfolioStyleGroup } from "@/lib/pro/public-profile";

type Props = {
  groups: PortfolioStyleGroup[];
};

export function InkPortfolioGallery({ groups }: Props) {
  const [activeStyle, setActiveStyle] = useState(groups[0]?.style ?? "");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => groups.find((g) => g.style === activeStyle) ?? groups[0],
    [groups, activeStyle],
  );

  if (groups.length === 0) return null;

  const showTabs = groups.length > 1;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-zinc-100">Portfolio</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Réalisations par style — cliquez pour agrandir
      </p>

      {showTabs && (
        <div className="mt-6 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.style}
              type="button"
              onClick={() => setActiveStyle(g.style)}
              className={
                activeGroup?.style === g.style
                  ? "rounded-full border border-amber-500 bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-300"
                  : "rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }
            >
              {g.label}
              <span className="ml-1.5 text-zinc-500">({g.images.length})</span>
            </button>
          ))}
        </div>
      )}

      {!showTabs && activeGroup && (
        <p className="mt-4 text-sm font-medium text-amber-400/90">
          {activeGroup.label}
        </p>
      )}

      {activeGroup && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {activeGroup.images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightboxUrl(img.image_url)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <Image
                src={img.image_url}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-zinc-900/80 p-2 text-zinc-300 hover:text-white"
            onClick={() => setLightboxUrl(null)}
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Portfolio"
              className="mx-auto max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
