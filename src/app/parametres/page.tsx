"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Globe, Moon, Sun } from "lucide-react";
import { fetchDashboardPath } from "@/lib/auth";
import { createClientOrNull } from "@/lib/supabase/client";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import type { Locale, Theme } from "@/lib/i18n/translations";

export default function ParametresPage() {
  const router = useRouter();
  const { theme, locale, setTheme, setLocale, t, mounted } = useAppPreferences();
  const [dashboardPath, setDashboardPath] = useState("/client/dashboard");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const supabase = createClientOrNull();
    if (!supabase) return;
    void fetchDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  function pickTheme(next: Theme) {
    setTheme(next);
    flashSaved();
  }

  function pickLocale(next: Locale) {
    setLocale(next);
    flashSaved();
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-blue-500/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400"
      >
        ← Retvy
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("settings.title")}
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-500">{t("settings.subtitle")}</p>

      {savedFlash && (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {t("settings.saved")}
        </p>
      )}

      <Card className="mt-8 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-500/80">
            {t("settings.appearance")}
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

      <Card className="mt-4 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-500/80">
            {t("settings.language")}
          </p>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          <LocaleOption
            active={locale === "fr"}
            label={t("settings.french")}
            icon={<Globe className="h-4 w-4" />}
            onClick={() => pickLocale("fr")}
          />
          <LocaleOption
            active={locale === "en"}
            label={t("settings.english")}
            icon={<Globe className="h-4 w-4" />}
            onClick={() => pickLocale("en")}
          />
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(dashboardPath)}
        >
          {t("settings.backDashboard")}
        </Button>
        <Link href="/" className="flex-1">
          <Button variant="ghost" className="w-full">
            {t("settings.backHome")}
          </Button>
        </Link>
      </div>

      <DeleteAccountSection />
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
          ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LocaleOption({
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
          ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
