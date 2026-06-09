"use client";

import { useSearchParams } from "next/navigation";

export function DeferredBookingNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("booking") !== "deferred") return null;

  return (
    <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
      Votre RDV est réservé. Le tatoueur a été notifié. Pensez à régler
      l&apos;acompte avant votre RDV.
    </div>
  );
}
