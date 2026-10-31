"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  type ProStyleSelection,
  type TattooStyleCatalog,
  fetchTattooStyleCatalog,
} from "@/lib/pro/tattoo-style-catalog";
import { createClientOrNull } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  value: ProStyleSelection;
  onChange: (value: ProStyleSelection) => void;
  catalog?: TattooStyleCatalog;
  disabled?: boolean;
  className?: string;
};

export function ProStylePicker({
  value,
  onChange,
  catalog: catalogProp,
  disabled,
  className,
}: Props) {
  const [catalog, setCatalog] = useState<TattooStyleCatalog | null>(
    catalogProp ?? null,
  );
  const [loading, setLoading] = useState(!catalogProp);
  const [error, setError] = useState<string | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (catalogProp) {
      setCatalog(catalogProp);
      setLoading(false);
      return;
    }

    const supabase = createClientOrNull();
    if (!supabase) {
      setError("Connexion indisponible.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    void fetchTattooStyleCatalog(supabase)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [catalogProp]);

  function toggleFamily(familySlug: string) {
    const isSelected = value.familySlugs.includes(familySlug);
    if (isSelected) {
      const family = catalog?.families.find((f) => f.slug === familySlug);
      const familyStyleIds = new Set(family?.styles.map((s) => s.id) ?? []);
      onChange({
        familySlugs: value.familySlugs.filter((s) => s !== familySlug),
        styleIds: value.styleIds.filter((id) => !familyStyleIds.has(id)),
      });
      setExpandedFamilies((prev) => {
        const next = new Set(prev);
        next.delete(familySlug);
        return next;
      });
      return;
    }

    onChange({
      familySlugs: [...value.familySlugs, familySlug],
      styleIds: value.styleIds,
    });
    setExpandedFamilies((prev) => new Set(prev).add(familySlug));
  }

  function toggleSubStyle(styleId: string, familySlug: string) {
    const familySelected = value.familySlugs.includes(familySlug);
    const nextFamilySlugs = familySelected
      ? value.familySlugs
      : [...value.familySlugs, familySlug];

    const isSelected = value.styleIds.includes(styleId);
    onChange({
      familySlugs: nextFamilySlugs,
      styleIds: isSelected
        ? value.styleIds.filter((id) => id !== styleId)
        : [...value.styleIds, styleId],
    });

    if (!expandedFamilies.has(familySlug)) {
      setExpandedFamilies((prev) => new Set(prev).add(familySlug));
    }
  }

  function toggleExpanded(familySlug: string) {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familySlug)) next.delete(familySlug);
      else next.add(familySlug);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des styles…
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <p className="text-sm text-red-400">
        {error ?? "Impossible de charger les styles."}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {catalog.families.map((family) => {
        const familyOn = value.familySlugs.includes(family.slug);
        const expanded = expandedFamilies.has(family.slug);
        const explicitInFamily = family.styles.filter((s) =>
          value.styleIds.includes(s.id),
        );
        const wholeFamily =
          familyOn && explicitInFamily.length === 0 && family.styles.length > 0;

        return (
          <div
            key={family.id}
            className={cn(
              "rounded-xl border transition-colors",
              familyOn
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50",
            )}
          >
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggleFamily(family.slug)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  familyOn
                    ? "font-medium text-blue-700 dark:text-blue-300"
                    : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {family.label}
                {wholeFamily && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    (toute la famille)
                  </span>
                )}
                {explicitInFamily.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    ({explicitInFamily.length} précisé
                    {explicitInFamily.length > 1 ? "s" : ""})
                  </span>
                )}
              </button>
              {familyOn && family.styles.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleExpanded(family.slug)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                  aria-label={
                    expanded
                      ? "Masquer les sous-styles"
                      : "Afficher les sous-styles"
                  }
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              )}
            </div>

            {familyOn && expanded && family.styles.length > 0 && (
              <div className="border-t border-zinc-200 px-3 pb-3 pt-2 dark:border-zinc-800/80">
                <p className="mb-2 text-xs text-zinc-500">
                  Précisez vos sous-styles (optionnel — sans sélection, toute la
                  famille est enregistrée).
                </p>
                <div className="flex flex-wrap gap-2">
                  {family.styles.map((style) => {
                    const on = value.styleIds.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleSubStyle(style.id, family.slug)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          on
                            ? "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600",
                          disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
