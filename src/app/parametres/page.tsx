"use client";

import Link from "next/link";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Locale, Theme } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

function ToggleOption<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-amber-500 text-black shadow-sm"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ParametresPage() {
  const { t, theme, locale, setTheme, setLocale } = useAppPreferences();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400"
      >
        {t.settings.back}
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        {t.settings.title}
      </h1>

      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.settings.appearance}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
            {t.settings.appearanceHint}
          </p>
        </CardHeader>
        <CardContent>
          <ToggleOption<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark", label: t.settings.dark },
              { value: "light", label: t.settings.light },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.settings.language}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
            {t.settings.languageHint}
          </p>
        </CardHeader>
        <CardContent>
          <ToggleOption<Locale>
            value={locale}
            onChange={setLocale}
            options={[
              { value: "fr", label: t.settings.french },
              { value: "en", label: t.settings.english },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
