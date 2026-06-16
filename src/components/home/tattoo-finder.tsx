"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  LANDING_STYLE_CHIPS,
  fetchTattooFinderArtists,
  resolveLandingStyleId,
  type LandingStyleChip,
  type TattooFinderAnswers,
  type TattooFinderArtist,
} from "@/lib/home/tattoo-finder";
import { createClientOrNull } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TattooFinderResults } from "@/components/home/tattoo-finder-results";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

type Props = {
  onResultsChange?: (showing: boolean) => void;
  compact?: boolean;
};

export function TattooFinder({ onResultsChange, compact }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [style, setStyle] = useState<LandingStyleChip | null>(null);
  const [city, setCity] = useState("");
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
    setAnswers(null);
    setArtists(null);
    setError(null);
    notifyResults(false);
  }

  async function runSearch(
    selectedStyle: LandingStyleChip,
    selectedCity: string,
  ) {
    const styleId = resolveLandingStyleId(selectedStyle);
    const nextAnswers: TattooFinderAnswers = {
      style: selectedStyle,
      styleId,
      city: selectedCity.trim(),
    };

    setLoading(true);
    setError(null);

    const supabase = createClientOrNull();
    if (!supabase) {
      setError("Connexion indisponible — réessayez plus tard.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await fetchTattooFinderArtists(
      supabase,
      nextAnswers,
    );

    if (queryError) {
      console.error("[TattooFinder] Supabase error:", {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
        hint: queryError.hint,
        error: queryError,
      });
      setLoading(false);
      setError("Impossible de charger les tatoueurs. Réessayez.");
      return;
    }

    setLoading(false);
    setAnswers(nextAnswers);
    setArtists(data ?? []);
    notifyResults(true);
  }

  function handleStyleSelect(value: LandingStyleChip) {
    setStyle(value);
    setStep(2);
  }

  async function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!style || loading) return;
    await runSearch(style, city.trim());
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
    <div className={cn(compact && "w-full")}>
      <Card
        className={cn(
          "mx-auto w-full overflow-hidden border-zinc-800 bg-[#0A0A0A]",
          compact && "aspect-square max-w-md",
        )}
      >
        <CardContent className="flex h-full flex-col p-0">
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-b border-zinc-800 px-4",
              compact ? "py-2.5" : "py-3",
            )}
          >
            <Sparkles className="h-4 w-4 text-[#0057FF]" />
            <span className="text-sm font-medium text-zinc-200">
              Trouver mon tatoueur
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-500">
              Étape {step}/2
            </span>
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col",
              compact
                ? "justify-center px-5 py-4"
                : "min-h-[280px] p-4 md:p-5",
            )}
          >
            {step === 1 && (
              <StepPanel
                compact={compact}
                title="Quel style vous intéresse ?"
                subtitle="Choisissez le style qui vous correspond."
              >
                <div
                  className={cn(
                    "flex flex-wrap gap-2.5",
                    compact && "justify-center",
                  )}
                >
                  {LANDING_STYLE_CHIPS.map((chip) => (
                    <ChipButton
                      key={chip.label}
                      active={style === chip.label}
                      compact={compact}
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
                compact={compact}
                title="Dans quelle ville ?"
                subtitle="Indiquez une ville ou laissez vide pour voir tous nos artistes."
              >
                <form
                  onSubmit={(e) => void handleCitySubmit(e)}
                  className={cn("space-y-4", compact && "text-center")}
                >
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex. Paris, Lyon… (optionnel)"
                    autoFocus
                    disabled={loading}
                    className={inputClass}
                  />
                  <div
                    className={cn(
                      "flex flex-wrap gap-2",
                      compact && "justify-center",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className={backButtonClass}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={primaryButtonClass}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Recherche…
                        </>
                      ) : (
                        <>
                          Voir les résultats
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
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
  compact,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in duration-300",
        compact ? "space-y-4 text-center" : "space-y-3 md:space-y-4",
      )}
    >
      <div>
        <h3
          className={cn(
            "font-semibold text-zinc-100",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
        <p className={cn("text-zinc-500", compact ? "mt-0.5 text-xs" : "mt-1 text-sm")}>
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}

function ChipButton({
  children,
  active,
  compact,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border text-sm transition-colors",
        compact ? "px-3.5 py-2" : "px-4 py-2",
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
  "disabled:opacity-50",
);

const backButtonClass = cn(
  "inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400",
  "transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40",
);

const primaryButtonClass = cn(
  "inline-flex items-center gap-2 rounded-xl bg-[#0057FF] px-4 py-2.5 text-sm font-medium text-white",
  "transition-colors hover:bg-[#0046d4] disabled:opacity-40",
);
