"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { PublicStudioPhoto } from "@/lib/pro/public-profile";

type Props = {
  photos: PublicStudioPhoto[];
};

export function InkStudioPhotoGrid({ photos }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-zinc-400">Photos du studio</p>
      <p className="mt-1 text-xs text-zinc-600">Cliquez pour agrandir</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxUrl(photo.image_url)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <Image
              src={photo.image_url}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
              unoptimized
            />
          </button>
        ))}
      </div>

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
              alt="Photo du studio"
              className="mx-auto max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
