"use client";

import { useState, useTransition } from "react";
import { UserCircle, Plus, Loader2, ExternalLink, Settings } from "lucide-react";
import { addArtistAction, switchProfile } from "@/app/actions/studio";
import { useRouter } from "next/navigation";
import type { StudioProfile } from "@/lib/pro/studio";

interface Props {
  profiles: StudioProfile[];
  maxArtists: number;
  canAdd: boolean;
}

export function ArtistesClient({ profiles, maxArtists, canAdd }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addArtistAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success && result.profileId) {
        await switchProfile(result.profileId);
        router.refresh();
        setShowForm(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Artistes du studio
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {profiles.length} / {maxArtists} artistes · Chacun a son propre portfolio, agenda et lien.
          </p>
        </div>
        {canAdd && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter un artiste
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/80">
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-100">Nouvel artiste</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nom artiste
              </label>
              <input
                name="artist_name"
                required
                placeholder="ex: Marco Ink"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Slug (lien public)
              </label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-zinc-400">retvy.fr/ink/</span>
                <input
                  name="slug"
                  required
                  placeholder="marco-ink"
                  pattern="[a-z0-9\-]+"
                  title="Lettres minuscules, chiffres et tirets uniquement"
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le profil
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <UserCircle className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">Aucun artiste pour l&apos;instant.</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/80"
            >
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <UserCircle className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {profile.artist_name ?? "Sans nom"}
                  </p>
                  <p className="text-xs text-zinc-400">retvy.fr/ink/{profile.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!profile.is_sub_profile && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    Principal
                  </span>
                )}
                {profile.is_sub_profile && (
                  <button
                    onClick={async () => {
                      await switchProfile(profile.id);
                      router.push("/pro/dashboard/profil");
                      router.refresh();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    title="Gérer ce profil"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Gérer
                  </button>
                )}
                <a
                  href={`/ink/${profile.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  title="Voir le profil public"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
