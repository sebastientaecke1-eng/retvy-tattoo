"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Shield, Sparkles } from "lucide-react";
import { TattooFinder } from "@/components/home/tattoo-finder";
import { SearchBar } from "@/components/home/search-bar";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function HomePageContent() {
  const { t } = useAppPreferences();
  const [finderResults, setFinderResults] = useState(false);
  const finderRef = useRef<HTMLDivElement>(null);

  const scrollToFinder = useCallback(() => {
    finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 md:pb-12 md:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0057FF]/30 bg-[#0057FF]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#0057FF]">
                <Sparkles className="h-3 w-3" />
                {t("home.badge")}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
                {t("home.title")}{" "}
                <span className="text-[#0057FF]">{t("home.titleHighlight")}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={scrollToFinder}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0057FF] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#0057FF]/20 transition-colors hover:bg-[#0046d4]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.ctaAi")}
              </button>
              <Link
                href="/pro/inscription"
                className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                {t("home.ctaPro")}
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <SearchBar className="mt-0 max-w-full" />
          </div>

          <div
            id="tattoo-finder"
            ref={finderRef}
            className="mt-5 scroll-mt-24"
          >
            <TattooFinder onResultsChange={setFinderResults} compact />
          </div>
        </div>
      </section>

      {!finderResults && (
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0057FF]/10 text-[#0057FF]">
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
        </section>
      )}
    </div>
  );
}
