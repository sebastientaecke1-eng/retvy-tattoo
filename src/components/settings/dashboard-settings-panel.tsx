"use client";

import { useState } from "react";
import { Check, LogOut, Moon, Sun } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Theme } from "@/lib/i18n/translations";

export function DashboardSettingsPanel() {
  const { theme, setTheme, t, mounted } = useAppPreferences();
  const [savedFlash, setSavedFlash] = useState(false);

  function pickTheme(next: Theme) {
    setTheme(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[#0057FF]/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Paramètres</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Thème, session et gestion de votre compte.
        </p>
        {savedFlash && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            {t("settings.saved")}
          </p>
        )}
      </div>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0057FF]">
            Thème
          </p>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          <ThemeOption
            active={theme === "dark"}
            label={t("settings.themeDark")}
            icon={<Moon className="h-4 w-4" />}
            onClick={() => pickTheme("dark")}
          />
          <ThemeOption
            active={theme === "light"}
            label={t("settings.themeLight")}
            icon={<Sun className="h-4 w-4" />}
            onClick={() => pickTheme("light")}
          />
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0057FF]">
            Session
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-400">
            Fermer votre session sur cet appareil.
          </p>
          <SignOutButton
            label="Se déconnecter"
            className="mt-4 border border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            icon={<LogOut className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      <DeleteAccountSection className="mt-0" />
    </div>
  );
}

function ThemeOption({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-[#0057FF] bg-[#0057FF]/10 text-[#0057FF]"
          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
