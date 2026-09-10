"use client";

import { useTransition } from "react";
import { selectProfileAction, goToAddArtistAction } from "./actions";
import type { StudioProfile } from "@/lib/pro/studio";
import type { PlanTier } from "@/lib/stripe/plans";
import { getMaxArtists } from "@/lib/stripe/plans";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const TINTS = [
  { bg: "#1a1f40", color: "#7090ff" },
  { bg: "#1f1a38", color: "#a07aff" },
  { bg: "#1a2830", color: "#5abcd8" },
  { bg: "#2a1a20", color: "#ff8080" },
  { bg: "#1a2820", color: "#60d890" },
];

export function ProfilePicker({
  profiles,
  tier,
  mainProfileId,
}: {
  profiles: StudioProfile[];
  tier: PlanTier;
  mainProfileId: string;
}) {
  const [pending, startTransition] = useTransition();
  const maxArtists = getMaxArtists(tier);
  const slotsLeft = maxArtists - profiles.length;

  function handleSelect(profileId: string) {
    startTransition(async () => {
      await selectProfileAction(profileId);
    });
  }

  function handleAddArtist() {
    startTransition(async () => {
      await goToAddArtistAction(mainProfileId);
    });
  }

  return (
    <div className="flex flex-wrap justify-center gap-5">
      {profiles.map((profile, i) => {
        const tint = TINTS[i % TINTS.length];
        const initials = getInitials(profile.artist_name);
        return (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile.id)}
            disabled={pending}
            className="group flex w-40 flex-col items-center gap-3 rounded-xl border border-transparent p-2 outline-none transition-all hover:border-[#4060ff] focus-visible:border-[#4060ff] focus-visible:ring-2 focus-visible:ring-[#4060ff]/40 disabled:opacity-60"
            aria-label={profile.artist_name ?? "Profil"}
          >
            <div className="relative w-full">
              <div
                className="flex aspect-square w-full items-center justify-center rounded-2xl text-2xl font-bold transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_40px_rgba(64,96,255,0.25)] group-hover:ring-2 group-hover:ring-[#4060ff]"
                style={{ background: tint.bg, color: tint.color }}
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.artist_name ?? ""}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span
                className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 bg-green-400"
                style={{ borderColor: tint.bg }}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-100 transition-colors group-hover:text-white">
                {profile.artist_name ?? "Artiste"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {profile.is_sub_profile ? "Sous-profil" : "Profil principal"}
              </p>
            </div>
          </button>
        );
      })}

      {slotsLeft > 0 && (
        <button
          onClick={handleAddArtist}
          disabled={pending}
          className="group flex w-40 flex-col items-center gap-3 rounded-xl border border-transparent p-2 outline-none transition-all hover:border-[#4060ff] focus-visible:border-[#4060ff] focus-visible:ring-2 focus-visible:ring-[#4060ff]/40 disabled:opacity-60"
          aria-label="Ajouter un artiste"
        >
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#4060ff] group-hover:bg-[#4060ff]/10">
            <svg
              className="h-8 w-8 stroke-zinc-500 transition-colors group-hover:stroke-[#4060ff]"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-400 transition-colors group-hover:text-[#4060ff]">
              Ajouter un artiste
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {slotsLeft} slot{slotsLeft > 1 ? "s" : ""} disponible{slotsLeft > 1 ? "s" : ""}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
