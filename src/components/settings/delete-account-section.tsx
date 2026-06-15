"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientOrNull } from "@/lib/supabase/client";
import { clearOnboardingStoredSession } from "@/lib/supabase/onboarding-session";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

const CONFIRM_WORD = "SUPPRIMER";

type DeleteAccountSectionProps = {
  className?: string;
};

export function DeleteAccountSection({ className }: DeleteAccountSectionProps) {
  const router = useRouter();
  const { t } = useAppPreferences();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText === CONFIRM_WORD && !deleting;

  function openModal() {
    setConfirmText("");
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (deleting) return;
    setModalOpen(false);
    setConfirmText("");
    setError(null);
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        redirect?: string;
      };

      if (!res.ok) {
        setError(data.error ?? t("settings.deleteError"));
        setDeleting(false);
        return;
      }

      clearOnboardingStoredSession();
      const supabase = createClientOrNull();
      if (supabase) {
        await supabase.auth.signOut();
      }

      router.push(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError(t("settings.deleteError"));
      setDeleting(false);
    }
  }

  return (
    <>
      <section
        className={`rounded-xl border border-red-500/25 bg-red-500/5 p-6 ${className ?? "mt-12"}`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
          {t("settings.dangerZone")}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("settings.dangerHint")}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-red-500/50 bg-red-600 text-white hover:bg-red-500 hover:text-white dark:border-red-500/40 dark:bg-red-600 dark:hover:bg-red-500"
          onClick={openModal}
        >
          {t("settings.deleteAccount")}
        </Button>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-red-500/30 bg-white p-6 shadow-xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-account-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {t("settings.deleteModalTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("settings.deleteModalBody")}
            </p>
            <label className="mt-5 block text-sm text-zinc-600 dark:text-zinc-400">
              {t("settings.deleteConfirmLabel")}
              <Input
                className="mt-2 font-mono"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                disabled={deleting}
              />
            </label>
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={deleting}
              >
                {t("settings.deleteCancel")}
              </Button>
              <Button
                type="button"
                disabled={!canConfirm}
                className="border-red-500/50 bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
                onClick={() => void handleConfirm()}
              >
                {deleting
                  ? t("settings.deleteSubmitting")
                  : t("settings.deleteConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
