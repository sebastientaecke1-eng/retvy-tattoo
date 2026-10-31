"use client";

import { useState } from "react";
import { Check, Loader2, Lock, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PlanTier } from "@/lib/stripe/plans";

type Props = {
  initialMusicUrl: string | null;
  subscriptionTier: PlanTier;
};

/** Transforme un lien Spotify / SoundCloud / YouTube en URL embed */
export function buildEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Spotify : open.spotify.com/track|album|playlist|artist/xxx
    if (u.hostname === "open.spotify.com") {
      return `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
    }
    // SoundCloud
    if (u.hostname === "soundcloud.com" || u.hostname === "www.soundcloud.com") {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
    }
    // YouTube : youtube.com/watch?v=xxx ou youtu.be/xxx
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.replace("/", "");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    // Apple Music
    if (u.hostname === "music.apple.com") {
      return url.replace("music.apple.com", "embed.music.apple.com");
    }
    return null;
  } catch {
    return null;
  }
}

function detectPlatform(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("spotify")) return "Spotify";
    if (u.hostname.includes("soundcloud")) return "SoundCloud";
    if (u.hostname.includes("youtube") || u.hostname.includes("youtu.be")) return "YouTube";
    if (u.hostname.includes("apple")) return "Apple Music";
    return "Lecteur";
  } catch {
    return "Lecteur";
  }
}

function EmbedPreview({ url }: { url: string }) {
  const embed = buildEmbedUrl(url);
  const platform = detectPlatform(url);

  if (!embed) {
    return (
      <p className="text-xs text-zinc-400 italic">
        Aperçu non disponible pour ce lien — il sera quand même affiché sur ton profil.
      </p>
    );
  }

  const isSpotify = embed.includes("spotify.com/embed");
  const isSoundCloud = embed.includes("soundcloud.com/player");

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
      <iframe
        src={embed}
        width="100%"
        height={isSpotify ? "152" : isSoundCloud ? "120" : "120"}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${platform} player`}
      />
    </div>
  );
}

export function MusicSection({ initialMusicUrl, subscriptionTier }: Props) {
  const canUse = subscriptionTier !== "free";
  const [url, setUrl] = useState(initialMusicUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate
  if (!canUse) {
    return (
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Music className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Musique sur le profil
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
            <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Affiche un lecteur audio sur ton profil public avec un lien{" "}
              <strong>Spotify, SoundCloud, YouTube ou Apple Music</strong>.
              Disponible à partir du plan <strong>Starter</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = url.trim();
    if (trimmed && !trimmed.startsWith("http")) {
      setError("Colle un lien complet (commençant par https://).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pro/profile/music", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ music_url: trimmed || null }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const hasPreview = url.trim().length > 0;

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Music className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Musique sur le profil
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Colle un lien Spotify, SoundCloud, YouTube ou Apple Music — un lecteur
          sera affiché directement sur ton profil public.
        </p>

        <form onSubmit={handleSave} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setSaved(false); setError(null); }}
              placeholder="https://open.spotify.com/track/..."
              className="h-9 text-sm pr-8"
            />
            {url && (
              <button
                type="button"
                onClick={() => { setUrl(""); setSaved(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {saving ? "…" : saved ? "Sauvegardé" : "Sauvegarder"}
          </Button>
        </form>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {hasPreview && (
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
              Aperçu
            </p>
            <EmbedPreview url={url} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
