"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, LayoutGrid, Map, Locate, X, SlidersHorizontal } from "lucide-react";
import { PRO_STYLE_OPTIONS } from "@/lib/pro/styles";
import type { ProProfileRow } from "@/lib/database.types";

const CatalogueMap = dynamic(
  () => import("./catalogue-map").then((m) => m.CatalogueMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" /> }
);

const STYLE_GROUPS = [
  { label: "Traditionnel", ids: ["old-school", "neo-traditionnel", "new-school", "japonais", "tribal", "polynesien", "celtique", "chicano"] },
  { label: "Réalisme", ids: ["realisme", "noir-et-gris", "micro-realisme", "portrait"] },
  { label: "Blackwork", ids: ["blackwork", "dotwork", "geometrique", "mandala", "ornamental"] },
  { label: "Fineline", ids: ["fineline", "minimaliste", "sketch", "lettering"] },
  { label: "Couleur", ids: ["aquarelle", "illustratif", "floral", "cartoon", "anime-manga", "pop-art", "gravure"] },
  { label: "Abstrait", ids: ["biomecanique", "trash-polka", "surrealism", "abstrait", "ignorant", "broderie", "patchwork"] },
  { label: "Paramédical", ids: ["paramedical"] },
];

function styleLabel(id: string): string {
  return PRO_STYLE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

interface ArtistCardProps {
  artist: ProProfileRow;
  isSelected: boolean;
  onClick: () => void;
}

function ArtistCard({ artist, isSelected, onClick }: ArtistCardProps) {
  const styles = (artist.styles ?? []).slice(0, 3);
  const priceStr =
    artist.price_min && artist.price_max
      ? `${artist.price_min}–${artist.price_max} €/h`
      : artist.price_min
        ? `Dès ${artist.price_min} €/h`
        : null;

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border bg-white dark:bg-zinc-900 cursor-pointer transition-all duration-200 overflow-hidden hover:shadow-md ${
        isSelected ? "border-blue-500 shadow-md ring-2 ring-blue-200" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
      }`}
    >
      <div className="relative h-36 bg-zinc-100 overflow-hidden">
        {artist.cover_url || artist.avatar_url ? (
          <Image
            src={artist.cover_url ?? artist.avatar_url!}
            alt={artist.artist_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
            <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-600">{artist.artist_name[0]}</span>
          </div>
        )}
        {artist.cover_url && artist.avatar_url && (
          <div className="absolute bottom-2 left-3 w-9 h-9 rounded-full border-2 border-white overflow-hidden shadow">
            <Image src={artist.avatar_url} alt="" fill sizes="36px" className="object-cover" />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">{artist.artist_name}</h3>
            {artist.studio && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{artist.studio}</p>}
          </div>
          {priceStr && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0">{priceStr}</span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1.5">
          <MapPin size={11} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{artist.city}</span>
        </div>

        {styles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {styles.map((s) => (
              <span key={s} className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                {styleLabel(s)}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/ink/${artist.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200 dark:border-blue-800 hover:border-blue-400 rounded-lg py-1.5 transition-colors"
        >
          Voir le profil →
        </Link>
      </div>
    </div>
  );
}

interface Props {
  artists: ProProfileRow[];
}

export function CatalogueClient({ artists: initialArtists }: Props) {
  // Always fetch from /api/artists on mount — server-side prop is ignored to avoid
  // issues with baked-in env keys in the Cloudflare bundle
  const [artists, setArtists] = useState<ProProfileRow[]>(initialArtists);
  const [loading, setLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [view, setView] = useState<"map" | "grid">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cardRef = useRef<Record<string, HTMLDivElement | null>>({});
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Always load artists from API — guarantees correct Supabase key at runtime
  useEffect(() => {
    setLoading(true);
    fetch("/api/artists")
      .then((r) => r.json())
      .then((data: { ok: boolean; artists?: ProProfileRow[] }) => {
        if (data.ok && data.artists) {
          setArtists(data.artists);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  // City geocoding — zooms the map, doesn't filter artists
  useEffect(() => {
    if (!cityQuery.trim()) {
      setGeoCenter(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&countrycodes=fr`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data = await res.json() as Array<{ lat: string; lon: string }>;
        if (data[0]) {
          setGeoCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          setView("map");
        }
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!filtersOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filtersOpen]);

  // Filter only by name and styles — city just pans the map
  const filtered = useMemo(() => {
    return artists.filter((a) => {
      if (nameQuery) {
        const q = nameQuery.toLowerCase();
        if (
          !a.artist_name.toLowerCase().includes(q) &&
          !(a.studio ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (selectedStyles.length > 0) {
        const artistStyles = a.styles ?? [];
        if (!selectedStyles.some((s) => artistStyles.includes(s))) return false;
      }
      return true;
    });
  }, [artists, nameQuery, selectedStyles]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCityQuery("");
        setLocating(false);
        setView("map");
        setFiltersOpen(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }, []);

  const resetFilters = useCallback(() => {
    setNameQuery("");
    setCityQuery("");
    setSelectedStyles([]);
    setGeoCenter(null);
  }, []);

  useEffect(() => {
    if (selectedId && cardRef.current[selectedId]) {
      cardRef.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const activeFilterCount = (nameQuery ? 1 : 0) + (cityQuery ? 1 : 0) + (selectedStyles.length > 0 ? 1 : 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: "calc(100dvh - 64px)" }}>
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Chargement des tatoueurs…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)", minHeight: "600px" }}>
      {/* Top bar */}
      <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex gap-2 items-center">
          {/* Artist name search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Rechercher un tatoueur…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Filtres button */}
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtres</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter dropdown panel */}
            {filtersOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 p-4 space-y-4">
                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Ville</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        placeholder="Ex : Paris, Lyon…"
                        className="w-full pl-8 pr-7 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                      {cityQuery && (
                        <button
                          onClick={() => setCityQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleLocate}
                      disabled={locating}
                      title="Autour de moi"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Locate size={14} className={locating ? "animate-spin" : ""} />
                      <span className="text-xs">Autour de moi</span>
                    </button>
                  </div>
                </div>

                {/* Styles */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_GROUPS.map((group) => (
                      <button
                        key={group.label}
                        onClick={() => {
                          const anySelected = group.ids.some((id) => selectedStyles.includes(id));
                          if (anySelected) {
                            setSelectedStyles((prev) => prev.filter((s) => !group.ids.includes(s)));
                          } else {
                            setSelectedStyles((prev) => [...new Set([...prev, ...group.ids])]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                          group.ids.some((id) => selectedStyles.includes(id))
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-600 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={resetFilters}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Autour de moi (quick access, also in filter panel) */}
          <button
            onClick={handleLocate}
            disabled={locating}
            title="Autour de moi"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <Locate size={15} className={locating ? "animate-spin" : ""} />
            <span className="hidden md:inline">Autour de moi</span>
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => setView("map")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === "map" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
            >
              <Map size={15} />
              <span className="hidden sm:inline">Carte</span>
            </button>
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === "grid" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grille</span>
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {(cityQuery || selectedStyles.length > 0) && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {cityQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                <MapPin size={10} />
                {cityQuery}
                <button onClick={() => setCityQuery("")} className="ml-0.5 hover:text-blue-900">
                  <X size={10} />
                </button>
              </span>
            )}
            {STYLE_GROUPS.filter((g) => g.ids.some((id) => selectedStyles.includes(id))).map((g) => (
              <span key={g.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                {g.label}
                <button
                  onClick={() => setSelectedStyles((prev) => prev.filter((s) => !g.ids.includes(s)))}
                  className="ml-0.5 hover:text-blue-900"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Result count */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          {filtered.length} tatoueur{filtered.length !== 1 ? "s" : ""}
          {activeFilterCount > 0 ? " correspondent à vos critères" : " sur Retvy"}
        </p>
      </div>

      {/* Main content */}
      {view === "map" ? (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: "400px" }}>
            <div className="absolute inset-0">
              <CatalogueMap
                artists={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                centerLat={geoCenter?.lat}
                centerLng={geoCenter?.lng}
              />
            </div>
          </div>

          <div className="hidden lg:flex flex-col w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-white dark:bg-zinc-950">
            {filtered.length === 0 ? (
              <EmptyState hasFilters={activeFilterCount > 0} />
            ) : (
              <div className="p-3 space-y-2">
                {filtered.map((artist) => (
                  <div key={artist.id} ref={(el) => { cardRef.current[artist.id] = el; }}>
                    <ArtistCard
                      artist={artist}
                      isSelected={selectedId === artist.id}
                      onClick={() => setSelectedId(selectedId === artist.id ? null : artist.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState hasFilters={activeFilterCount > 0} />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isSelected={selectedId === artist.id}
                  onClick={() => setSelectedId(selectedId === artist.id ? null : artist.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Search size={20} className="text-zinc-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {hasFilters ? "Aucun résultat" : "Bientôt disponible"}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {hasFilters
            ? "Essayez d&apos;élargir vos critères de recherche."
            : "Les premiers tatoueurs arrivent prochainement sur Retvy."}
        </p>
      </div>
    </div>
  );
}
