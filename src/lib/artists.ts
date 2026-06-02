import { createAdminClient } from "@/lib/supabase/admin";

export type MatchedArtist = {
  id: string;
  name: string;
  studio: string;
  styles: string[];
  slug: string;
  city: string;
  priceMin: number;
  priceMax: number;
  bio: string;
  image: string;
  source: "database" | "demo";
};

export type MatchResult = {
  summary: {
    style: string;
    bodyZone: string;
    size: string;
    budget: number;
    city: string;
    referenceNote: string | null;
  };
  priceEstimate: { min: number; max: number };
  artists: MatchedArtist[];
};

const DEMO_ARTISTS: Omit<MatchedArtist, "city" | "image">[] = [
  {
    id: "marc-aurele",
    name: "Marc-Aurèle",
    studio: "Studio L'Encre Noire",
    styles: ["Réalisme", "Portrait", "Blackwork"],
    slug: "marcaurele",
    priceMin: 450,
    priceMax: 800,
    bio: "10 ans d'expérience en réalisme black & grey.",
    source: "demo",
  },
  {
    id: "elena-v",
    name: "Elena V.",
    studio: "Atelier Sillage",
    styles: ["Fineline", "Minimaliste"],
    slug: "elenav",
    priceMin: 180,
    priceMax: 450,
    bio: "Trait fin et compositions botaniques.",
    source: "demo",
  },
  {
    id: "hayato",
    name: "Hayato",
    studio: "Edo Ink",
    styles: ["Japonais", "Néo-traditionnel"],
    slug: "hayato",
    priceMin: 500,
    priceMax: 1200,
    bio: "Tradition japonaise, koi, dragons, vagues.",
    source: "demo",
  },
  {
    id: "kuro",
    name: "Kuro",
    studio: "Void Gallery",
    styles: ["Blackwork", "Géométrique"],
    slug: "kuro",
    priceMin: 350,
    priceMax: 900,
    bio: "Blackwork ornemental et géométrie sacrée.",
    source: "demo",
  },
];

function avatarFor(seed: string) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

export function normalizeCity(input: string): string {
  const k = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
  return map[k] ?? input.charAt(0).toUpperCase() + input.slice(1);
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
  if (style.includes("réalisme") || style.includes("realisme") || style.includes("japonais"))
    mult = 1.4;
  else if (style.includes("aquarelle") || style.includes("blackwork")) mult = 1.2;
  else if (style.includes("minimal") || style.includes("fine")) mult = 0.8;

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
  limit?: number;
}): Promise<MatchedArtist[]> {
  const city = normalizeCity(opts.city);
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("pro_profiles_public")
    .select("*")
    .ilike("city", `%${city}%`)
    .limit(20);

  if (!rows?.length) return [];

  const styleNeedle = (opts.style ?? "").toLowerCase();

  const scored = rows
    .filter((r) => r.slug && r.artist_name)
    .map((r) => {
      let score = 0;
      const styles = r.styles ?? [];
      if (
        styleNeedle &&
        styles.some(
          (s) =>
            s.toLowerCase().includes(styleNeedle) ||
            styleNeedle.includes(s.toLowerCase()),
        )
      ) {
        score += 10;
      }
      const pMin = r.price_min ?? 0;
      if (opts.budget && pMin <= opts.budget) score += 3;
      return { row: r, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, opts.limit ?? 4).map(({ row }) => ({
    id: row.slug!,
    slug: row.slug!,
    name: row.artist_name!,
    studio: row.studio ?? "Studio indépendant",
    styles: row.styles ?? [],
    city: row.city ?? city,
    priceMin: row.price_min ?? 200,
    priceMax: row.price_max ?? 600,
    bio: row.bio ?? "",
    image: row.avatar_url ?? avatarFor(row.slug!),
    source: "database" as const,
  }));
}

export function matchArtistsDemo(opts: {
  style?: string;
  city: string;
  budget?: number;
}): MatchedArtist[] {
  const city = normalizeCity(opts.city);
  const style = (opts.style ?? "").toLowerCase();

  const scored = DEMO_ARTISTS.map((a) => {
    let score = 0;
    if (
      style &&
      a.styles.some(
        (s) =>
          s.toLowerCase().includes(style) || style.includes(s.toLowerCase()),
      )
    ) {
      score += 10;
    }
    if (opts.budget && a.priceMin <= opts.budget) score += 3;
    score += Math.random();
    return { a, score };
  });

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, 4).map(({ a }) => ({
    ...a,
    city,
    image: avatarFor(a.slug),
  }));
}

export async function matchArtists(opts: {
  style?: string;
  city: string;
  budget?: number;
}): Promise<MatchedArtist[]> {
  const fromDb = await matchArtistsFromDb(opts);
  if (fromDb.length >= 2) return fromDb;
  const demo = matchArtistsDemo(opts);
  const slugs = new Set(fromDb.map((a) => a.slug));
  for (const d of demo) {
    if (fromDb.length >= 4) break;
    if (!slugs.has(d.slug)) fromDb.push(d);
  }
  return fromDb.slice(0, 4);
}

export async function getArtistBySlug(
  slug: string,
  city = "Paris",
): Promise<MatchedArtist | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pro_profiles_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (data?.artist_name && data.slug) {
    return {
      id: data.slug,
      slug: data.slug,
      name: data.artist_name,
      studio: data.studio ?? "",
      styles: data.styles ?? [],
      city: data.city ?? city,
      priceMin: data.price_min ?? 200,
      priceMax: data.price_max ?? 600,
      bio: data.bio ?? "",
      image: data.avatar_url ?? avatarFor(data.slug),
      source: "database",
    };
  }

  const demo = DEMO_ARTISTS.find((a) => a.slug === slug || a.id === slug);
  if (!demo) return null;
  return {
    ...demo,
    city: normalizeCity(city),
    image: avatarFor(demo.slug),
  };
}
