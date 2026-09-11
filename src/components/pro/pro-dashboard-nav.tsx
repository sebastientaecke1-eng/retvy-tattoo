"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Users, Plus, Lock } from "lucide-react";
import { switchProfile } from "@/app/actions/studio";
import type { StudioProfile } from "@/lib/pro/studio";

function navClass(active: boolean, blocked = false) {
  if (blocked) {
    return "flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50";
  }
  return active
    ? "rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
    : "rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200";
}

interface ProDashboardNavProps {
  profiles: StudioProfile[];
  activeProfileId: string | null;
  isStudio: boolean;
  maxArtists: number;
  subscriptionStatus?: string;
}

export function ProDashboardNav({
  profiles,
  activeProfileId,
  isStudio,
  maxArtists,
  subscriptionStatus = "active",
}: ProDashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isBlocked = subscriptionStatus === "canceled" || subscriptionStatus === "canceling";
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  async function handleSwitch(profileId: string) {
    setOpen(false);
    await switchProfile(profileId);
    router.refresh();
  }

  function BlockedLink({ href, children }: { href: string; children: React.ReactNode }) {
    if (isBlocked) {
      return (
        <span className={navClass(false, true)} title="Abonnement résilié — accès limité">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {children}
        </span>
      );
    }
    return (
      <Link href={href} className={navClass(pathname.startsWith(href))}>
        {children}
      </Link>
    );
  }

  return (
    <nav className="mt-6 flex flex-col gap-1 text-sm">
      {/* Bannière résiliation */}
      {isBlocked && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
          {subscriptionStatus === "canceling"
            ? "Résiliation planifiée — accès limité aux paramètres."
            : "Abonnement résilié — accès limité."}
        </div>
      )}

      {/* Switcher de profil */}
      {isStudio && profiles.length > 0 && !isBlocked && (
        <div className="mb-3 relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="truncate font-medium">
              {activeProfile?.artist_name ?? "Profil"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                    p.id === activeProfileId
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {p.artist_name ?? "Sans nom"}
                  {p.is_sub_profile && (
                    <span className="ml-2 text-xs text-zinc-400">artiste</span>
                  )}
                </button>
              ))}
              {profiles.length < maxArtists && (
                <Link
                  href="/pro/dashboard/artistes"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un artiste
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <BlockedLink href="/pro/dashboard/reservations">Réservations</BlockedLink>
      <BlockedLink href="/pro/dashboard/croquis">Croquis</BlockedLink>
      <BlockedLink href="/pro/dashboard/disponibilites">Disponibilités</BlockedLink>
      <BlockedLink href="/pro/dashboard/acompte">Acomptes</BlockedLink>
      <BlockedLink href="/pro/dashboard/profil">Mon profil</BlockedLink>
      <BlockedLink href="/pro/dashboard/lien">Mon lien</BlockedLink>

      {isStudio && (
        <BlockedLink href="/pro/dashboard/artistes">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Artistes
          </span>
        </BlockedLink>
      )}

      {/* Paramètres — toujours accessible */}
      <Link
        href="/pro/dashboard/parametres"
        className={navClass(pathname.startsWith("/pro/dashboard/parametres"))}
      >
        Paramètres
      </Link>
    </nav>
  );
}
