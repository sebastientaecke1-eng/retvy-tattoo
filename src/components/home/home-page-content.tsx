"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Shield, Sparkles } from "lucide-react";
import { TattooFinder } from "@/components/home/tattoo-finder";
import { SearchBar } from "@/components/home/search-bar";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { cn } from "@/lib/utils";

const ctaPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-base font-semibold text-black shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400";
const ctaOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/50 px-6 py-3 text-base text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400";

export function HomePageContent() {
  const { t } = useAppPreferences();
  const [finderResults, setFinderResults] = useState(false);

  const features = [
    {
      icon: Sparkles,
      title: t("home.feature1Title"),
      text: t("home.feature1Text"),
    },
    {
      icon: MapPin,
      title: t("home.feature2Title"),
      text: t("home.feature2Text"),
    },
    {
      icon: Shield,
      title: t("home.feature3Title"),
      text: t("home.feature3Text"),
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-900">
        <div className="gradient-gold pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/5 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t("home.badge")}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl">
            {t("home.title")}{" "}
            <span className="text-blue-500 dark:text-blue-400">
              {t("home.titleHighlight")}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            {t("home.subtitle")}
          </p>
          <SearchBar />
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="#chat" className={ctaPrimary}>
              {t("home.ctaAi")}
            </Link>
            <Link href="/pro/inscription" className={ctaOutline}>
              {t("home.ctaPro")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div
          className={cn(
            "grid gap-12 lg:items-start",
            finderResults ? "grid-cols-1" : "lg:grid-cols-2",
          )}
        >
          <div className={finderResults ? "col-span-full" : undefined}>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {t("home.sectionTitle")}
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-500">
              {t("home.sectionSubtitle")}
            </p>
            <div id="chat" className="mt-6">
              <TattooFinder onResultsChange={setFinderResults} />
            </div>
          </div>
          {!finderResults && (
            <div className="space-y-8 pt-4">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-800 dark:text-zinc-200">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
