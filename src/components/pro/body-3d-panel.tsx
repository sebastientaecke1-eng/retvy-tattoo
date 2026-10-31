"use client";

/**
 * Body3DPanel — Feature 10 (Premium has3DBody)
 * Affiche une silhouette humaine simplifiée SVG avec la zone du tatouage en surbrillance.
 * Utilisé dans le tchat croquis côté pro.
 */

const ZONE_COLORS: Record<string, string> = {
  tete: "#a855f7",
  cou: "#a855f7",
  epaule: "#3b82f6",
  bras: "#3b82f6",
  avant_bras: "#60a5fa",
  main: "#60a5fa",
  poitrine: "#f59e0b",
  ventre: "#f59e0b",
  dos: "#ef4444",
  lombes: "#ef4444",
  hanche: "#10b981",
  fesse: "#10b981",
  cuisse: "#84cc16",
  genou: "#84cc16",
  mollet: "#a3e635",
  cheville: "#a3e635",
  pied: "#a3e635",
};

function normalizeZone(zone: string | null | undefined): string {
  if (!zone) return "";
  return zone
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getZoneColor(zone: string | null | undefined): string {
  const n = normalizeZone(zone);
  for (const [k, v] of Object.entries(ZONE_COLORS)) {
    if (n.includes(k)) return v;
  }
  return "#6366f1";
}

interface Body3DPanelProps {
  zone: string | null | undefined;
  className?: string;
}

export function Body3DPanel({ zone, className = "" }: Body3DPanelProps) {
  const color = getZoneColor(zone);
  const zoneLabel = zone ?? "non spécifiée";
  const normalized = normalizeZone(zone);

  // Zones SVG highlight map (coordonnées sur silhouette 100×220)
  const highlights: Record<string, React.ReactElement> = {
    tete: <ellipse cx="50" cy="18" rx="14" ry="16" fill={color} opacity="0.7" />,
    cou: <rect x="43" y="33" width="14" height="10" rx="4" fill={color} opacity="0.7" />,
    epaule: (
      <>
        <ellipse cx="22" cy="48" rx="12" ry="9" fill={color} opacity="0.7" />
        <ellipse cx="78" cy="48" rx="12" ry="9" fill={color} opacity="0.7" />
      </>
    ),
    bras: (
      <>
        <rect x="8" y="55" width="14" height="40" rx="7" fill={color} opacity="0.7" />
        <rect x="78" y="55" width="14" height="40" rx="7" fill={color} opacity="0.7" />
      </>
    ),
    avant_bras: (
      <>
        <rect x="6" y="95" width="14" height="35" rx="7" fill={color} opacity="0.7" />
        <rect x="80" y="95" width="14" height="35" rx="7" fill={color} opacity="0.7" />
      </>
    ),
    main: (
      <>
        <ellipse cx="13" cy="140" rx="9" ry="7" fill={color} opacity="0.7" />
        <ellipse cx="87" cy="140" rx="9" ry="7" fill={color} opacity="0.7" />
      </>
    ),
    poitrine: <rect x="30" y="44" width="40" height="30" rx="6" fill={color} opacity="0.7" />,
    ventre: <rect x="33" y="75" width="34" height="30" rx="6" fill={color} opacity="0.7" />,
    dos: <rect x="30" y="44" width="40" height="62" rx="6" fill={color} opacity="0.5" />,
    lombes: <rect x="30" y="95" width="40" height="20" rx="6" fill={color} opacity="0.7" />,
    hanche: <rect x="28" y="108" width="44" height="18" rx="6" fill={color} opacity="0.7" />,
    fesse: <rect x="30" y="108" width="40" height="20" rx="6" fill={color} opacity="0.6" />,
    cuisse: (
      <>
        <rect x="30" y="126" width="18" height="40" rx="8" fill={color} opacity="0.7" />
        <rect x="52" y="126" width="18" height="40" rx="8" fill={color} opacity="0.7" />
      </>
    ),
    genou: (
      <>
        <ellipse cx="39" cy="168" rx="10" ry="8" fill={color} opacity="0.7" />
        <ellipse cx="61" cy="168" rx="10" ry="8" fill={color} opacity="0.7" />
      </>
    ),
    mollet: (
      <>
        <rect x="30" y="174" width="16" height="30" rx="7" fill={color} opacity="0.7" />
        <rect x="54" y="174" width="16" height="30" rx="7" fill={color} opacity="0.7" />
      </>
    ),
    cheville: (
      <>
        <rect x="30" y="204" width="15" height="9" rx="4" fill={color} opacity="0.7" />
        <rect x="55" y="204" width="15" height="9" rx="4" fill={color} opacity="0.7" />
      </>
    ),
    pied: (
      <>
        <ellipse cx="37" cy="216" rx="14" ry="7" fill={color} opacity="0.7" />
        <ellipse cx="63" cy="216" rx="14" ry="7" fill={color} opacity="0.7" />
      </>
    ),
  };

  // Trouver la meilleure correspondance
  let highlight: React.ReactElement | null = null;
  for (const [k, el] of Object.entries(highlights)) {
    if (normalized.includes(k)) { highlight = el; break; }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Zone</p>
      <div className="relative">
        <svg viewBox="0 0 100 230" width="72" height="166" aria-label="Corps humain">
          {/* Silhouette */}
          {/* tête */}
          <ellipse cx="50" cy="18" rx="14" ry="16" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* cou */}
          <rect x="43" y="33" width="14" height="10" rx="3" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* torse */}
          <rect x="28" y="42" width="44" height="70" rx="8" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* bras G */}
          <rect x="6" y="44" width="22" height="65" rx="10" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* main G */}
          <ellipse cx="17" cy="118" rx="10" ry="8" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* bras D */}
          <rect x="72" y="44" width="22" height="65" rx="10" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* main D */}
          <ellipse cx="83" cy="118" rx="10" ry="8" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* hanches */}
          <rect x="28" y="112" width="44" height="22" rx="5" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* jambe G */}
          <rect x="28" y="133" width="18" height="80" rx="9" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* pied G */}
          <ellipse cx="37" cy="218" rx="15" ry="8" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* jambe D */}
          <rect x="54" y="133" width="18" height="80" rx="9" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* pied D */}
          <ellipse cx="63" cy="218" rx="15" ry="8" fill="none" stroke="#52525b" strokeWidth="1.5" />

          {/* Highlight zone */}
          {highlight}
        </svg>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {zoneLabel}
      </span>
    </div>
  );
}
