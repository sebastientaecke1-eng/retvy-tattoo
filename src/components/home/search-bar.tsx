"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Search } from "lucide-react";
import { createClientOrNull } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SearchResult = {
  artist_name: string;
  city: string | null;
  slug: string;
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

export function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    const supabase = createClientOrNull();
    if (!supabase) {
      setResults([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("pro_profiles_public")
      .select("artist_name, city, slug")
      .ilike("artist_name", `%${escapeIlike(q)}%`)
      .not("slug", "is", null)
      .order("artist_name")
      .limit(8);

    setLoading(false);

    if (error) {
      console.error("[SearchBar]", error.message);
      setResults([]);
      setOpen(true);
      return;
    }

    setResults(
      (data ?? []).filter(
        (row): row is SearchResult =>
          typeof row.slug === "string" &&
          row.slug.length > 0 &&
          typeof row.artist_name === "string" &&
          row.artist_name.length > 0,
      ),
    );
    setOpen(true);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void search(trimmed);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH;
  const showEmpty = showDropdown && !loading && results.length === 0;

  function goToProfile(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/ink/${slug}`);
  }

  return (
    <div ref={containerRef} className="relative z-10 mt-8 max-w-xl">
      <label htmlFor="artist-search" className="sr-only">
        Rechercher un tatoueur
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0057FF]"
          aria-hidden
        />
        <input
          id="artist-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (trimmedQuery.length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          placeholder="Rechercher un tatoueur..."
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border border-zinc-700 bg-[#0A0A0A] py-3 pl-11 pr-11 text-sm text-zinc-100 shadow-sm shadow-black/20",
            "placeholder:text-zinc-600",
            "focus:border-[#0057FF] focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30",
          )}
        />
        {loading && (
          <Loader2
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#0057FF]"
            aria-hidden
          />
        )}
      </div>

      {showDropdown && (
        <ul
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-800 bg-[#0A0A0A] py-1 shadow-xl shadow-black/40"
          role="listbox"
        >
          {showEmpty ? (
            <li className="px-4 py-3 text-sm text-zinc-500">
              Aucun tatoueur trouvé
            </li>
          ) : (
            results.map((result) => (
              <li key={result.slug} role="option">
                <button
                  type="button"
                  onClick={() => goToProfile(result.slug)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors",
                    "hover:bg-[#0057FF]/10 focus:bg-[#0057FF]/10 focus:outline-none",
                  )}
                >
                  <span className="text-sm font-medium text-zinc-100">
                    {result.artist_name}
                  </span>
                  {result.city ? (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3 w-3 shrink-0 text-[#0057FF]/80" />
                      {result.city}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
