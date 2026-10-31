"use client";

import { useState, useRef } from "react";
import type { PlanTier } from "@/lib/stripe/plans";
import { hasFeature } from "@/lib/stripe/plans";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Video } from "lucide-react";

interface BannerSectionProps {
  initialCoverUrl?: string | null;
  initialBannerVideoUrl?: string | null;
  subscriptionTier?: PlanTier;
}

export function BannerSection({
  initialCoverUrl,
  initialBannerVideoUrl,
  subscriptionTier = "free",
}: BannerSectionProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl ?? null);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(initialBannerVideoUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [coverSaved, setCoverSaved] = useState(false);
  const [videoSaved, setVideoSaved] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canImageBanner = hasFeature(subscriptionTier, "hasImageBanner");
  const canAnimatedBanner = hasFeature(subscriptionTier, "hasAnimatedBanner");

  async function uploadFile(file: File, kind: string) {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    const res = await fetch("/api/pro/profile/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erreur upload");
    return json.url as string;
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError(null);
    setCoverSaved(false);
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, "cover");
      setCoverUrl(url);
      setCoverSaved(true);
      setTimeout(() => setCoverSaved(false), 3000);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError(null);
    setVideoSaved(false);
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file, "banner-video");
      setBannerVideoUrl(url);
      setVideoSaved(true);
      setTimeout(() => setVideoSaved(false), 3000);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  }

  async function removeCover() {
    setCoverUrl(null);
    await fetch("/api/pro/profile/clear-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "cover_url" }),
    });
  }

  async function removeVideo() {
    setBannerVideoUrl(null);
    await fetch("/api/pro/profile/clear-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "banner_video_url" }),
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
        Banniere du profil
      </h2>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">Image de couverture</span>
          {!canImageBanner && (
            <span className="ml-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Starter+
            </span>
          )}
        </div>

        {!canImageBanner ? (
          <p className="text-xs text-zinc-500">
            Disponible a partir du plan Starter (22 EUR/mois). Ajoutez une image de couverture
            personnalisee sur votre profil public.
          </p>
        ) : (
          <>
            <div className="relative h-28 w-full overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Banniere" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadingCover ? "Upload..." : coverSaved ? "Sauvegarde" : "Choisir une image"}
            </Button>
            {coverError && <p className="text-xs text-red-400">{coverError}</p>}
            <p className="text-xs text-zinc-600">JPG, PNG, WebP ou GIF - max 5 Mo</p>
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">Banniere animee</span>
          {!canAnimatedBanner && (
            <span className="ml-1 rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-400">
              Pro+
            </span>
          )}
        </div>

        {!canAnimatedBanner ? (
          <p className="text-xs text-zinc-500">
            Disponible a partir du plan Pro (27 EUR/mois). Remplace l image fixe par une
            courte video ou GIF anime en haut de votre profil.
          </p>
        ) : (
          <>
            <div className="relative h-28 w-full overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
              {bannerVideoUrl ? (
                <>
                  {bannerVideoUrl.endsWith(".gif") ? (
                    <img src={bannerVideoUrl} alt="Banniere animee" className="h-full w-full object-cover" />
                  ) : (
                    <video
                      src={bannerVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-600">
                  <Video className="h-8 w-8" />
                  <span className="text-xs">Aucune video</span>
                </div>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,image/gif"
              className="hidden"
              onChange={handleVideoChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadingVideo ? "Upload..." : videoSaved ? "Sauvegarde" : "Choisir une video / GIF"}
            </Button>
            {videoError && <p className="text-xs text-red-400">{videoError}</p>}
            <p className="text-xs text-zinc-600">MP4, WebM ou GIF anime - max 30 Mo - duree recommandee 5-15s</p>
          </>
        )}
      </div>
    </div>
  );
}
