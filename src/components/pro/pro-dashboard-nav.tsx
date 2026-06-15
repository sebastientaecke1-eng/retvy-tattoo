"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean) {
  return active
    ? "rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
    : "rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200";
}

export function ProDashboardNav() {
  const pathname = usePathname();
  const onReservations = pathname.startsWith("/pro/dashboard/reservations");
  const onSketches = pathname.startsWith("/pro/dashboard/croquis");
  const onAvailabilities = pathname.startsWith("/pro/dashboard/disponibilites");
  const onDeposit = pathname.startsWith("/pro/dashboard/acompte");
  const onProfile = pathname.startsWith("/pro/dashboard/profil");
  const onPersonalLink = pathname.startsWith("/pro/dashboard/lien");
  const onSettings = pathname.startsWith("/pro/dashboard/parametres");

  return (
    <nav className="mt-8 flex flex-col gap-2 text-sm">
      <Link
        href="/pro/dashboard/reservations"
        className={navClass(onReservations)}
      >
        Réservations
      </Link>
      <Link href="/pro/dashboard/croquis" className={navClass(onSketches)}>
        Croquis
      </Link>
      <Link
        href="/pro/dashboard/disponibilites"
        className={navClass(onAvailabilities)}
      >
        Disponibilités
      </Link>
      <Link href="/pro/dashboard/acompte" className={navClass(onDeposit)}>
        Acomptes
      </Link>
      <Link href="/pro/dashboard/profil" className={navClass(onProfile)}>
        Mon profil
      </Link>
      <Link href="/pro/dashboard/lien" className={navClass(onPersonalLink)}>
        Mon lien
      </Link>
      <Link href="/pro/dashboard/parametres" className={navClass(onSettings)}>
        Paramètres
      </Link>
    </nav>
  );
}
