export type SizeCategory = "small" | "medium" | "large";

export type DurationTierRange = {
  min: number;
  max: number;
};

export type StyleDurationTierInput = {
  style: string;
  size_category: SizeCategory;
  duration_min_minutes: number;
  duration_max_minutes: number;
};

export const SIZE_CATEGORY_OPTIONS: {
  id: SizeCategory;
  label: string;
  hint: string;
}[] = [
  { id: "small", label: "Petit", hint: "< 10 cm" },
  { id: "medium", label: "Moyen", hint: "10–25 cm" },
  { id: "large", label: "Grand", hint: "25 cm+" },
];

export const DEFAULT_DURATION_TIERS: Record<SizeCategory, DurationTierRange> = {
  small: { min: 30, max: 90 },
  medium: { min: 90, max: 180 },
  large: { min: 180, max: 360 },
};

/** Moyenne utilisée par l'IA pour estimer et bloquer un créneau. */
export function averageDurationMinutes(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

export function isSizeCategory(value: string): value is SizeCategory {
  return value === "small" || value === "medium" || value === "large";
}

export function buildDefaultTierState(
  styles: string[],
): Record<string, Record<SizeCategory, DurationTierRange>> {
  const state: Record<string, Record<SizeCategory, DurationTierRange>> = {};
  for (const style of styles) {
    state[style] = {
      small: { ...DEFAULT_DURATION_TIERS.small },
      medium: { ...DEFAULT_DURATION_TIERS.medium },
      large: { ...DEFAULT_DURATION_TIERS.large },
    };
  }
  return state;
}

export function mergeInitialTierState(
  styles: string[],
  rows: {
    style: string;
    size_category?: string | null;
    duration_min_minutes?: number | null;
    duration_max_minutes?: number | null;
    duration_minutes?: number | null;
  }[],
): Record<string, Record<SizeCategory, DurationTierRange>> {
  const state = buildDefaultTierState(styles);

  for (const row of rows) {
    if (!styles.includes(row.style)) continue;
    const cat = row.size_category;
    if (!cat || !isSizeCategory(cat)) continue;

    const min =
      row.duration_min_minutes ??
      row.duration_minutes ??
      DEFAULT_DURATION_TIERS[cat].min;
    const max =
      row.duration_max_minutes ??
      row.duration_minutes ??
      DEFAULT_DURATION_TIERS[cat].max;

    state[row.style][cat] = { min, max };
  }

  return state;
}

export function flattenTierState(
  tiers: Record<string, Record<SizeCategory, DurationTierRange>>,
): StyleDurationTierInput[] {
  const out: StyleDurationTierInput[] = [];
  for (const [style, bySize] of Object.entries(tiers)) {
    for (const option of SIZE_CATEGORY_OPTIONS) {
      const range = bySize[option.id];
      out.push({
        style,
        size_category: option.id,
        duration_min_minutes: range.min,
        duration_max_minutes: range.max,
      });
    }
  }
  return out;
}
