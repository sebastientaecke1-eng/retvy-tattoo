"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean) {
  return active
    ? "rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
    : "rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-200";
}

export function ClientDashboardNav() {
  const pathname = usePathname();
  const onBookings = pathname === "/client/dashboard";
  const onSettings = pathname.startsWith("/client/dashboard/parametres");

  return (
    <nav className="mt-6 flex flex-col gap-2 text-sm md:mt-8">
      <Link href="/client/dashboard" className={navClass(onBookings)}>
        Mes rendez-vous
      </Link>
      <Link href="/client/dashboard/parametres" className={navClass(onSettings)}>
        Paramètres
      </Link>
    </nav>
  );
}
