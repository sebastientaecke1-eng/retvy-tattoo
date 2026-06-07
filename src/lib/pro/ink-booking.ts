import type { SizeCategory } from "@/lib/pro/style-duration-tiers";
import { isSizeCategory } from "@/lib/pro/style-duration-tiers";
import { styleLabel } from "@/lib/pro/public-profile";

export type InkBookingIntake = {
  style: string;
  zone: string;
  size: string;
  size_category: SizeCategory;
  budget: number;
  preferred_dates: string[];
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  reference_image_url?: string | null;
  reference_note?: string | null;
  project_description: string;
};

export function parseSizeCategory(text: string): SizeCategory {
  const t = text.toLowerCase();
  if (/petit|small|<\s*10/.test(t)) return "small";
  if (/grand|large|25cm\+|>\s*25|plus\s*de\s*25/.test(t)) return "large";
  if (/moyen|medium|10.?25/.test(t)) return "medium";
  return "medium";
}

export function sizeCategoryLabel(cat: SizeCategory): string {
  if (cat === "small") return "Petit (< 10 cm)";
  if (cat === "large") return "Grand (25 cm+)";
  return "Moyen (10–25 cm)";
}

export function buildProjectDescription(intake: Pick<
  InkBookingIntake,
  "style" | "zone" | "size" | "budget" | "reference_note"
>): string {
  const parts = [
    styleLabel(intake.style),
    intake.zone,
    intake.size,
    `Budget ~${intake.budget}€`,
  ];
  if (intake.reference_note) parts.push(`Réf. : ${intake.reference_note}`);
  return parts.filter(Boolean).join(" · ");
}

export function combineBookingDateTime(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}`).toISOString();
}

export function parseIsoDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const fr = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function normalizeSizeCategory(value: string): SizeCategory {
  if (isSizeCategory(value)) return value;
  return parseSizeCategory(value);
}
