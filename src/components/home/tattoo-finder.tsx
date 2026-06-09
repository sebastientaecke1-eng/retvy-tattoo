"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  LANDING_BUDGET_CHIPS,
  LANDING_STYLE_CHIPS,
  artistMatchesStyle,
  buildTattooFinderQuery,
  resolveLandingStyleId,
  type LandingBudgetChip,
  type LandingStyleChip,
  type TattooFinderAnswers,
  type TattooFinderArtist,
} from "@/lib/home/tattoo-finder";
import { createClientOrNull } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TattooFinderResults } from "@/components/home/tattoo-finder-results";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

type Props = {
  onResultsChange?: (showing: boolean) => void;
};

export function TattooFinder({ onResultsChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [style, setStyle] = useState<LandingStyleChip | null>(null);
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState<LandingBudgetChip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<TattooFinderAnswers | null>(null);
  const [artists, setArtists] = useState<TattooFinderArtist[] | null>(null);

  const showingResults = artists !== null && answers !== null;

  function notifyResults(show: boolean) {
    onResultsChange?.(show);
  }

  function reset() {
    setStep(1);
    setStyle(null);
    setCity("");
    setBudget(null);
    setAnswers(null);
    setArtists(null);
    setError(null);
    notifyResults(false);
  }

  async function runSearch(
    selectedStyle: LandingStyleChip,
    selectedCity: string,
    selectedBudget: LandingBudgetChip,
  ) {
    const styleId = resolveLandingStyleId(selectedStyle);
    const nextAnswers: TattooFinderAnswers = {
      style: selectedStyle,
      styleId,
      city: selectedCity.trim(),
      budget: selectedBudget,
    };

    setLoading(true);
    setError(null);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError("Connexion indisponible — réessayez plus tard.");
      setLoading(false);
      return;
    }

    const query = buildTattooFinderQuery(supabase, nextAnswers);
    if (!query) {
      setError("Connexion indisponible — réessayez plus tard.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await query;

    setLoading(false);

    if (queryError) {
      console.error("[TattooFinder]", queryError.message);
      setError("Impossible de charger les tatoueurs. Réessayez.");
      return;
    }

    const rows = (data ?? []).filter(
      (row): row is TattooFinderArtist =>
        typeof row.slug === "string" &&
        row.slug.length > 0 &&
        typeof row.artist_name === "string" &&
        artistMatchesStyle(row.styles, styleId),
    );

    setAnswers(nextAnswers);
    setArtists(rows);
    notifyResults(true);
  }

  function handleStyleSelect(value: LandingStyleChip) {
    setStyle(value);
    setStep(2);
  }

  function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed || !style) return;
    setStep(3);
  }

  async function handleBudgetSelect(value: LandingBudgetChip) {
    if (!style) return;
    const trimmed = city.trim();
    if (!trimmed) return;
    setBudget(value);
    await runSearch(style, trimmed, value);
  }

  if (showingResults && answers) {
    return (
      <TattooFinderResults
        artists={artists ?? []}
        answers={answers}
        onReset={reset}
      />
    );
  }

  return (
    <div>
      <Card className="overflow-hidden border-zinc-800 bg-[#0A0A0A]">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <Sparkles className="h-4 w-4 text-[#0057FF]" />
            <span className="text-sm font-medium text-zinc-200">
              Trouver mon tatoueur
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-500">
              Étape {step}/3
            </span>
          </div>

          <div className="min-h-[280px] p-6">
            {step === 1 && (
              <StepPanel
                title="Quel style vous intéresse ?"
                subtitle="Choisissez le style qui vous correspond."
              >
                <div className="flex flex-wrap gap-2">
                  {LANDING_STYLE_CHIPS.map((chip) => (
                    <ChipButton
                      key={chip.label}
                      active={style === chip.label}
                      onClick={() => handleStyleSelect(chip.label)}
                    >
                      {chip.label}
                    </ChipButton>
                  ))}
                </div>
              </StepPanel>
            )}

            {step === 2 && (
              <StepPanel
                title="Dans quelle ville ?"
                subtitle="Indiquez la ville où vous souhaitez vous faire tatouer."
              >
                <form onSubmit={handleCitySubmit} className="space-y-4">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex. Paris, Lyon, Marseille…"
                    autoFocus
                    className={inputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={backButtonClass}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={!city.trim()}
                      className={primaryButtonClass}
                    >
                      Continuer
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </StepPanel>
            )}

            {step === 3 && (
              <StepPanel
                title="Quel est votre budget ?"
                subtitle="Cela nous aide à affiner votre recherche."
              >
                {loading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0057FF]" />
                    Recherche des tatoueurs…
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {LANDING_BUDGET_CHIPS.map((chip) => (
                        <ChipButton
                          key={chip}
                          active={budget === chip}
                          onClick={() => void handleBudgetSelect(chip)}
                        >
                          {chip}
                        </ChipButton>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={cn(backButtonClass, "mt-4")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour
                    </button>
                  </>
                )}
              </StepPanel>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChipButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors",
        active
          ? "border-[#0057FF] bg-[#0057FF]/15 text-[#7eb3ff]"
          : "border-zinc-700 text-zinc-400 hover:border-[#0057FF]/50 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100",
  "placeholder:text-zinc-600 focus:border-[#0057FF]/60 focus:outline-none focus:ring-2 focus:ring-[#0057FF]/20",
);

const backButtonClass = cn(
  "inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400",
  "transition-colors hover:border-zinc-600 hover:text-zinc-200",
);

const primaryButtonClass = cn(
  "inline-flex items-center gap-2 rounded-xl bg-[#0057FF] px-4 py-2.5 text-sm font-medium text-white",
  "transition-colors hover:bg-[#0046d4] disabled:opacity-40",
);
