"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean) {
  return active
    ? "rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
    : "rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200";
}

export function ProDashboardNav({ slug }: { slug?: string | null }) {
  const pathname = usePathname();
  const onOverview = pathname === "/pro/dashboard";
  const onProfile = pathname.startsWith("/pro/dashboard/profil");

  return (
    <nav className="mt-8 flex flex-col gap-2 text-sm">
      <Link href="/parametres" className={navClass(false)}>
        Paramètres
      </Link>
      <Link href="/pro/dashboard" className={navClass(onOverview)}>
        Vue d&apos;ensemble
      </Link>
      <Link href="/pro/dashboard/profil" className={navClass(onProfile)}>
        Mon profil
      </Link>
      {slug && (
        <Link
          href={`/ink/${slug}`}
          className="rounded-lg px-3 py-2 text-zinc-500 hover:text-amber-400"
          target="_blank"
        >
          Profil public ↗
        </Link>
      )}
    </nav>
  );
}
