"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

const POLL_INTERVAL_MS = 4_000;

type Props = {
  email: string;
};

export function ProEmailConfirmationBanner({ email }: Props) {
  const router = useRouter();
  const { t } = useAppPreferences();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    async function tick() {
      if (cancelled) return;

      try {
        const res = await fetch("/api/auth/confirmation-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as { confirmed?: boolean };
        if (data.confirmed) {
          setVisible(false);
          router.refresh();
          return;
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) {
        window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    void tick();

    return () => {
      cancelled = true;
    };
  }, [email, router, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3"
    >
      <div className="flex gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300">
            {t("signup.emailConfirmTitle")}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            {t("signup.emailConfirmBody").replace("{email}", email)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("signup.emailConfirmSpam")}
          </p>
        </div>
      </div>
    </div>
  );
}
