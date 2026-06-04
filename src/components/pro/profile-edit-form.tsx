"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import type { ProPortfolioRow, ProProfileRow } from "@/lib/database.types";
import { PRO_STYLE_OPTIONS, type ProStyleId } from "@/lib/pro/styles";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PortfolioItem = Pick<
  ProPortfolioRow,
  "id" | "style" | "image_url" | "position"
>;

type Props = {
  initialProfile: ProProfileRow;
  initialPortfolio: PortfolioItem[];
};

function normalizeStyles(styles: string[]): ProStyleId[] {
  return styles.filter((s): s is ProStyleId =>
    PRO_STYLE_OPTIONS.some((o) => o.id === s),
  );
}

export function ProfileEditForm({ initialProfile, initialPortfolio }: Props) {
  const [artistName, setArtistName] = useState(initialProfile.artist_name);
  const [studio, setStudio] = useState(initialProfile.studio ?? "");
  const [city, setCity] = useState(initialProfile.city);
  const [address, setAddress] = useState(initialProfile.address ?? "");
  const [phone, setPhone] = useState(initialProfile.phone);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [styles, setStyles] = useState<ProStyleId[]>(
    normalizeStyles(initialProfile.styles ?? []),
  );
  const [priceMin, setPriceMin] = useState(
    initialProfile.price_min != null ? String(initialProfile.price_min) : "",
  );
  const [priceMax, setPriceMax] = useState(
    initialProfile.price_max != null ? String(initialProfile.price_max) : "",
  );
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio);

  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const portfolioByStyle = useMemo(() => {
    const map = new Map<string, PortfolioItem[]>();
    for (const item of portfolio) {
      const list = map.get(item.style) ?? [];
      list.push(item);
      map.set(item.style, list);
    }
    return map;
  }, [portfolio]);

  function toggleStyle(id: ProStyleId) {
    setStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("kind", "avatar");
      fd.set("file", file);
      const res = await fetch("/api/pro/profile/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec upload");
      if (data.url) setAvatarUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function uploadPortfolio(style: ProStyleId, file: File) {
    setPortfolioUploading(style);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("kind", "portfolio");
      fd.set("style", style);
      fd.set("file", file);
      const res = await fetch("/api/pro/profile/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as {
        item?: PortfolioItem;
        error?: string;
      };
      if (!res.ok || !data.item) {
        throw new Error(data.error ?? "Échec upload");
      }
      setPortfolio((prev) => [...prev, data.item!]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setPortfolioUploading(null);
    }
  }

  async function removePortfolio(id: string) {
    setError(null);
    const res = await fetch(`/api/pro/profile/portfolio?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Suppression impossible");
      return;
    }
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    if (styles.length === 0) {
      setError("Sélectionnez au moins un style.");
      setSaving(false);
      return;
    }

    const pMin = priceMin.trim() === "" ? null : Number(priceMin);
    const pMax = priceMax.trim() === "" ? null : Number(priceMax);
    if (
      (pMin != null && Number.isNaN(pMin)) ||
      (pMax != null && Number.isNaN(pMax))
    ) {
      setError("Tarifs invalides.");
      setSaving(false);
      return;
    }
    if (pMin != null && pMax != null && pMax < pMin) {
      setError("Le tarif max doit être supérieur ou égal au min.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/pro/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: artistName.trim(),
          studio: studio.trim() || null,
          city: city.trim(),
          address: address.trim() || null,
          phone: phone.trim(),
          bio: bio.trim() || null,
          styles,
          price_min: pMin,
          price_max: pMax,
          avatar_url: avatarUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Échec sauvegarde");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Mon profil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Page publique :{" "}
          <span className="font-mono text-amber-400">/ink/{initialProfile.slug}</span>
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Profil enregistré
        </p>
      )}

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Photo de profil
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6 pt-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-bold text-amber-400">
                {artistName.charAt(0) || "?"}
              </div>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
            {avatarUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {avatarUploading ? "Envoi…" : "Changer la photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={avatarUploading}
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) void uploadAvatar(f);
                ev.target.value = "";
              }}
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Informations
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <Field label="Nom d'artiste *">
            <Input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              required
            />
          </Field>
          <Field label="Nom du studio">
            <Input value={studio} onChange={(e) => setStudio(e.target.value)} />
          </Field>
          <Field label="Ville *">
            <Input value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
          <Field label="Téléphone *">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              type="tel"
            />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Bio" className="sm:col-span-2">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              placeholder="Présentez votre univers, votre expérience…"
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Styles pratiqués
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {PRO_STYLE_OPTIONS.map((opt) => {
              const on = styles.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleStyle(opt.id)}
                  className={
                    on
                      ? "rounded-full border border-amber-500 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300"
                      : "rounded-full border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Tarifs indicatifs (€)
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <Field label="Minimum">
            <Input
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="150"
            />
          </Field>
          <Field label="Maximum">
            <Input
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="500"
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
            Portfolio par style
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Ajoutez des photos pour chaque style que vous pratiquez.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pt-0">
          {styles.length === 0 && (
            <p className="text-sm text-zinc-500">
              Cochez au moins un style pour afficher les zones d&apos;upload.
            </p>
          )}
          {styles.map((styleId) => {
            const label =
              PRO_STYLE_OPTIONS.find((o) => o.id === styleId)?.label ?? styleId;
            const images = portfolioByStyle.get(styleId) ?? [];
            const uploading = portfolioUploading === styleId;

            return (
              <div
                key={styleId}
                className="rounded-xl border border-zinc-800/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-zinc-200">{label}</h3>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Ajouter une photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        if (f) void uploadPortfolio(styleId, f);
                        ev.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
                      >
                        <Image
                          src={img.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="200px"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => void removePortfolio(img.id)}
                          className="absolute right-1 top-1 rounded-md bg-black/70 p-1.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-600">Aucune photo pour ce style.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer le profil"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
