import { createAdminClient } from "@/lib/supabase/admin";
import { styleLabel } from "@/lib/pro/public-profile";
import { PRO_STYLE_OPTIONS } from "@/lib/pro/styles";

export type MatchedArtist = {
  id: string;
  name: string;
  studio: string;
  styles: string[];
  slug: string;
  city: string;
  priceMin: number | null;
  priceMax: number | null;
  bio: string;
  image: string;
  profileUrl: string;
  source: "database";
};

export type MatchSearchScope =
  | "city"
  | "department"
  | "neighbors"
  | "region"
  | null;

export type MatchResult = {
  summary: {
    style: string;
    bodyZone: string;
    size: string;
    budget: number;
    city: string;
    referenceNote: string | null;
    maxDistanceKm?: number | null;
  };
  priceEstimate: { min: number; max: number };
  artists: MatchedArtist[];
  noArtistsFound: boolean;
  needsTravelRadius: boolean;
  searchScope: MatchSearchScope;
};

type ProfileRow = {
  slug: string | null;
  artist_name: string | null;
  studio: string | null;
  styles: string[] | null;
  city: string | null;
  postal_code: string | null;
  price_min: number | null;
  price_max: number | null;
  bio: string | null;
  avatar_url: string | null;
};

const CITY_DEPARTMENTS: Record<string, string> = {
  paris: "75",
  lyon: "69",
  marseille: "13",
  bordeaux: "33",
  toulouse: "31",
  lille: "59",
  nantes: "44",
  nice: "06",
  strasbourg: "67",
  montpellier: "34",
  rennes: "35",
  grenoble: "38",
  dijon: "21",
  reims: "51",
  toulon: "83",
  angers: "49",
  clermont: "63",
  clermontferrand: "63",
  tours: "37",
  nimes: "30",
  aixenprovence: "13",
  brest: "29",
  lehavre: "76",
};

const REGION_DEPARTMENTS: Record<string, string[]> = {
  "ile-de-france": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "auvergne-rhone-alpes": [
    "01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74",
  ],
  "provence-alpes-cote-dazur": ["04", "05", "06", "13", "83", "84"],
  occitanie: [
    "09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82",
  ],
  "nouvelle-aquitaine": [
    "16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87",
  ],
  "hauts-de-france": ["02", "59", "60", "62", "80"],
  "grand-est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  bretagne: ["22", "29", "35", "56"],
  "pays-de-la-loire": ["44", "49", "53", "72", "85"],
  normandie: ["14", "27", "50", "61", "76"],
  "bourgogne-franche-comte": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "centre-val-de-loire": ["18", "28", "36", "37", "41", "45"],
  corse: ["2A", "2B"],
};

/** Départements voisins approximatifs (rayon ~50 km). */
const NEIGHBORING_DEPARTMENTS: Record<string, string[]> = {
  "01": ["38", "39", "69", "71", "73", "74"],
  "06": ["04", "83"],
  "13": ["30", "34", "83", "84"],
  "21": ["39", "52", "58", "71", "89"],
  "29": ["22", "35", "56"],
  "31": ["09", "32", "65", "81", "82"],
  "33": ["16", "17", "24", "40", "47"],
  "34": ["11", "12", "30", "81"],
  "35": ["22", "44", "49", "53", "56"],
  "38": ["01", "05", "07", "26", "42", "73", "69"],
  "44": ["35", "49", "56", "85"],
  "49": ["35", "44", "53", "72", "79", "86"],
  "59": ["02", "08", "62", "80"],
  "63": ["03", "15", "19", "23", "43"],
  "67": ["08", "54", "57", "68", "88"],
  "69": ["01", "38", "42", "71"],
  "75": ["77", "78", "91", "92", "93", "94", "95"],
  "76": ["14", "27", "60", "80"],
  "83": ["04", "06", "13", "84"],
};

const STYLE_ALIASES: Record<string, string> = {
  realisme: "realisme",
  réalisme: "realisme",
  realism: "realisme",
  portrait: "realisme",
  japonais: "japonais",
  japanese: "japonais",
  irezumi: "japonais",
  minimaliste: "minimaliste",
  minimal: "minimaliste",
  fineline: "fineline",
  "fine line": "fineline",
  blackwork: "blackwork",
  geometrique: "geometrique",
  géométrique: "geometrique",
  geometric: "geometrique",
  "old school": "old-school",
  oldschool: "old-school",
  traditionnel: "old-school",
  aquarelle: "aquarelle",
  watercolor: "aquarelle",
  "neo-traditionnel": "neo-traditionnel",
  neotrad: "neo-traditionnel",
  tribal: "tribal",
  dotwork: "dotwork",
  lettering: "lettering",
};

function avatarFor(seed: string) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function normalizeCityKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeCity(input: string): string {
  const k = normalizeCityKey(input);
  const map: Record<string, string> = {
    paris: "Paris",
    lyon: "Lyon",
    marseille: "Marseille",
    bordeaux: "Bordeaux",
    toulouse: "Toulouse",
    lille: "Lille",
    nantes: "Nantes",
    nice: "Nice",
  };
  return map[k] ?? input.trim().charAt(0).toUpperCase() + input.trim().slice(1);
}

function citiesMatch(a: string, b: string): boolean {
  const ka = normalizeCityKey(a);
  const kb = normalizeCityKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

/** 2 premiers chiffres du code postal = département. */
export function getDepartment(postalCode: string | null): string | null {
  if (!postalCode?.trim()) return null;
  const pc = postalCode.trim().toUpperCase();
  if (/^20[0-9]/.test(pc)) return pc.startsWith("201") ? "2A" : "2B";
  if (/^97\d/.test(pc)) return pc.slice(0, 3);
  if (/^\d{5}$/.test(pc)) return pc.slice(0, 2);
  return pc.slice(0, 2);
}

/** 1er chiffre du département = zone macro (approximation régionale). */
function getMacroZone(postalCode: string | null): string | null {
  const dept = getDepartment(postalCode);
  if (!dept || !/^\d/.test(dept)) return null;
  return dept[0];
}

function getRegionForDepartment(dept: string): string | null {
  const normalized = dept.toUpperCase();
  for (const [region, depts] of Object.entries(REGION_DEPARTMENTS)) {
    if (depts.includes(normalized)) return region;
  }
  return null;
}

function resolveDepartmentForCity(city: string, rows: ProfileRow[]): string | null {
  const key = normalizeCityKey(city);
  if (CITY_DEPARTMENTS[key]) return CITY_DEPARTMENTS[key];

  for (const row of rows) {
    if (row.city && citiesMatch(row.city, city) && row.postal_code) {
      return getDepartment(row.postal_code);
    }
  }

  return null;
}

function resolvePostalCodeForCity(city: string, rows: ProfileRow[]): string | null {
  for (const row of rows) {
    if (row.city && citiesMatch(row.city, city) && row.postal_code) {
      return row.postal_code;
    }
  }
  return null;
}

function getAllowedDepartments(
  targetDept: string,
  maxDistanceKm: number,
): Set<string> {
  const allowed = new Set<string>([targetDept]);

  if (maxDistanceKm <= 20) {
    return allowed;
  }

  const neighbors = NEIGHBORING_DEPARTMENTS[targetDept] ?? [];
  if (maxDistanceKm <= 50) {
    neighbors.forEach((d) => allowed.add(d));
    return allowed;
  }

  const region = getRegionForDepartment(targetDept);
  if (region) {
    REGION_DEPARTMENTS[region].forEach((d) => allowed.add(d));
  }

  return allowed;
}

type LocationTier = "city" | "department" | "neighbors" | "region" | "none";

function getLocationTier(
  profileCity: string,
  profilePostal: string | null,
  targetCity: string,
  targetDept: string | null,
  targetMacroZone: string | null,
  maxDistanceKm: number | undefined,
): LocationTier {
  if (citiesMatch(profileCity, targetCity)) {
    return "city";
  }

  if (maxDistanceKm == null) {
    return "none";
  }

  const profileDept = getDepartment(profilePostal);
  if (!targetDept || !profileDept) {
    if (maxDistanceKm >= 100 && targetMacroZone) {
      const profileZone = getMacroZone(profilePostal);
      if (profileZone && profileZone === targetMacroZone) return "region";
    }
    return "none";
  }

  if (maxDistanceKm <= 20) {
    return profileDept === targetDept ? "department" : "none";
  }

  if (maxDistanceKm <= 50) {
    if (profileDept === targetDept) return "department";
    const neighbors = NEIGHBORING_DEPARTMENTS[targetDept] ?? [];
    if (neighbors.includes(profileDept)) return "neighbors";
    return "none";
  }

  const allowed = getAllowedDepartments(targetDept, maxDistanceKm);
  if (allowed.has(profileDept)) {
    if (profileDept === targetDept) return "department";
    const neighbors = NEIGHBORING_DEPARTMENTS[targetDept] ?? [];
    if (neighbors.includes(profileDept)) return "neighbors";
    return "region";
  }

  if (targetMacroZone && getMacroZone(profilePostal) === targetMacroZone) {
    return "region";
  }

  return "none";
}

function tierToScope(tier: LocationTier): MatchSearchScope {
  if (tier === "city") return "city";
  if (tier === "department") return "department";
  if (tier === "neighbors") return "neighbors";
  if (tier === "region") return "region";
  return null;
}

const TIER_PRIORITY: Record<LocationTier, number> = {
  city: 100,
  department: 50,
  neighbors: 40,
  region: 25,
  none: 0,
};

function resolveStyleIds(styleInput: string): string[] {
  const normalized = styleInput
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const ids = new Set<string>();

  for (const [alias, id] of Object.entries(STYLE_ALIASES)) {
    const aliasNorm = alias
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(aliasNorm)) ids.add(id);
  }

  for (const opt of PRO_STYLE_OPTIONS) {
    const labelNorm = opt.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(opt.id) || normalized.includes(labelNorm)) {
      ids.add(opt.id);
    }
  }

  return [...ids];
}

function matchesStyle(
  profileStyles: string[],
  styleIds: string[],
  rawInput?: string,
): boolean {
  if (!rawInput?.trim()) return true;

  if (styleIds.length > 0) {
    return profileStyles.some((s) => styleIds.includes(s));
  }

  const needle = rawInput
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return profileStyles.some((s) => {
    const label = styleLabel(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      s.toLowerCase().includes(needle) ||
      label.includes(needle) ||
      needle.includes(label)
    );
  });
}

function matchesBudget(priceMin: number | null, budget?: number): boolean {
  if (!budget || budget <= 0) return true;
  if (priceMin != null && priceMin > budget) return false;
  return true;
}

function rowToMatchedArtist(row: ProfileRow): MatchedArtist {
  const slug = row.slug!;
  return {
    id: slug,
    slug,
    name: row.artist_name!,
    studio: row.studio ?? "Studio indépendant",
    styles: (row.styles ?? []).map((s) => styleLabel(s)),
    city: row.city ?? "",
    priceMin: row.price_min,
    priceMax: row.price_max,
    bio: row.bio ?? "",
    image: row.avatar_url ?? avatarFor(slug),
    profileUrl: `/ink/${slug}`,
    source: "database",
  };
}

export function estimatePrice(opts: {
  style?: string;
  size?: string;
  bodyZone?: string;
}): { min: number; max: number } {
  const sizeKey = (opts.size ?? "").toLowerCase();
  let base = 250;
  if (sizeKey.includes("petit") || sizeKey.includes("5cm")) base = 150;
  else if (sizeKey.includes("moyen")) base = 400;
  else if (sizeKey.includes("grand") || sizeKey.includes("15")) base = 800;

  const style = (opts.style ?? "").toLowerCase();
  let mult = 1;
  if (
    style.includes("réalisme") ||
    style.includes("realisme") ||
    style.includes("japonais")
  ) {
    mult = 1.4;
  } else if (style.includes("aquarelle") || style.includes("blackwork")) {
    mult = 1.2;
  } else if (style.includes("minimal") || style.includes("fine")) {
    mult = 0.8;
  }

  const center = Math.round((base * mult) / 10) * 10;
  return {
    min: Math.round((center * 0.8) / 10) * 10,
    max: Math.round((center * 1.4) / 10) * 10,
  };
}

export async function matchArtistsFromDb(opts: {
  style?: string;
  city: string;
  budget?: number;
  maxDistanceKm?: number;
  limit?: number;
}): Promise<{
  artists: MatchedArtist[];
  searchScope: MatchSearchScope;
  needsTravelRadius: boolean;
}> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("pro_profiles")
    .select(
      "slug, artist_name, studio, styles, city, postal_code, price_min, price_max, bio, avatar_url",
    )
    .not("slug", "is", null)
    .not("artist_name", "is", null);

  if (error) {
    console.error("[matchArtists] pro_profiles:", error.message);
    return { artists: [], searchScope: null, needsTravelRadius: false };
  }

  if (!rows?.length) {
    return { artists: [], searchScope: null, needsTravelRadius: false };
  }

  const profiles = rows as ProfileRow[];
  const targetCity = normalizeCity(opts.city);
  const targetDept = resolveDepartmentForCity(targetCity, profiles);
  const targetPostal = resolvePostalCodeForCity(targetCity, profiles);
  const targetMacroZone = getMacroZone(targetPostal);
  const styleIds = resolveStyleIds(opts.style ?? "");
  const maxDistanceKm = opts.maxDistanceKm;

  type Scored = { row: ProfileRow; tier: LocationTier; score: number };

  const styleBudgetMatches: ProfileRow[] = [];
  const cityOnlyMatches: Scored[] = [];
  const widerMatches: Scored[] = [];

  for (const row of profiles) {
    if (!row.slug || !row.artist_name) continue;
    if (!matchesStyle(row.styles ?? [], styleIds, opts.style)) continue;
    if (!matchesBudget(row.price_min, opts.budget)) continue;

    styleBudgetMatches.push(row);

    const tierCity = getLocationTier(
      row.city ?? "",
      row.postal_code,
      targetCity,
      targetDept,
      targetMacroZone,
      undefined,
    );
    if (tierCity === "city") {
      cityOnlyMatches.push({
        row,
        tier: "city",
        score: TIER_PRIORITY.city,
      });
    }

    const tierWide = getLocationTier(
      row.city ?? "",
      row.postal_code,
      targetCity,
      targetDept,
      targetMacroZone,
      maxDistanceKm ?? 100,
    );
    if (tierWide !== "none") {
      widerMatches.push({
        row,
        tier: tierWide,
        score: TIER_PRIORITY[tierWide],
      });
    }
  }

  const needsTravelRadius =
    maxDistanceKm == null &&
    cityOnlyMatches.length === 0 &&
    widerMatches.length > 0;

  if (needsTravelRadius) {
    return { artists: [], searchScope: null, needsTravelRadius: true };
  }

  const candidates =
    maxDistanceKm == null
      ? cityOnlyMatches
      : widerMatches.filter((c) => {
          const tier = getLocationTier(
            c.row.city ?? "",
            c.row.postal_code,
            targetCity,
            targetDept,
            targetMacroZone,
            maxDistanceKm,
          );
          if (tier === "none") return false;
          c.tier = tier;
          c.score = TIER_PRIORITY[tier];
          return true;
        });

  if (candidates.length === 0) {
    return { artists: [], searchScope: null, needsTravelRadius: false };
  }

  candidates.sort((a, b) => b.score - a.score);

  const bestTier = candidates[0]?.tier ?? "none";
  const searchScope = tierToScope(bestTier);

  const artists = candidates
    .slice(0, opts.limit ?? 4)
    .map(({ row }) => rowToMatchedArtist(row));

  return { artists, searchScope, needsTravelRadius: false };
}

export async function matchArtists(opts: {
  style?: string;
  city: string;
  budget?: number;
  maxDistanceKm?: number;
  limit?: number;
}): Promise<{
  artists: MatchedArtist[];
  searchScope: MatchSearchScope;
  needsTravelRadius: boolean;
}> {
  return matchArtistsFromDb(opts);
}

export async function getArtistBySlug(
  slug: string,
): Promise<MatchedArtist | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pro_profiles")
    .select(
      "slug, artist_name, studio, styles, city, postal_code, price_min, price_max, bio, avatar_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (data?.artist_name && data.slug) {
    return rowToMatchedArtist(data as ProfileRow);
  }

  return null;
}
