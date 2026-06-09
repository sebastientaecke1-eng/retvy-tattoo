import { parisWallTimeToUtcIso } from "@/lib/datetime/paris";
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

/** Extrait un montant en euros : "~300€", "300€", "300", 300 → 300. */
export function parseBudgetEuros(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.replace(/\s/g, "").match(/(\d+)/);
  if (!match) return null;
  return Math.max(0, parseInt(match[1], 10));
}

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

/** Convertit "10h", "10h30", "14h00", "10:00" → "HH:MM". */
export function normalizeSlotTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.toLowerCase().replace(/\s+/g, "");

  const colon = compact.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const french = compact.match(/^(\d{1,2})h(\d{2})?$/) ?? trimmed.match(/(\d{1,2})\s*h(?:\s*(\d{2}))?/i);
  if (french) {
    const h = Number(french[1]);
    const m = french[2] ? Number(french[2]) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
}

export function normalizeSlotDate(value: string): string | null {
  const trimmed = value.trim();
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];
  return parseIsoDateInput(trimmed);
}

type SlotCandidate = {
  date: string;
  time: string;
  duration_minutes: number;
};

/**
 * Résout date + heure à partir de l'entrée IA et des créneaux disponibles.
 * Corrige les cas où l'heure est absente, en "00:00" ou au format "10h".
 */
export function resolveBookingSlot(opts: {
  slot_date: string;
  slot_time: string;
  availableSlots?: SlotCandidate[];
}): {
  slot_date: string;
  slot_time: string;
  duration_minutes?: number;
  matched: boolean;
} {
  const slot_date = normalizeSlotDate(opts.slot_date);
  if (!slot_date) {
    throw new Error(`Date invalide : ${opts.slot_date}`);
  }

  let slot_time = normalizeSlotTime(opts.slot_time);
  const embeddedTime = opts.slot_date.match(/[T ](\d{1,2}:\d{2})/);
  if (!slot_time && embeddedTime) {
    slot_time = normalizeSlotTime(embeddedTime[1]);
  }

  const daySlots = (opts.availableSlots ?? []).filter((s) => s.date === slot_date);

  const pick = (slot: SlotCandidate) => ({
    slot_date,
    slot_time: slot.time.slice(0, 5),
    duration_minutes: slot.duration_minutes,
    matched: true,
  });

  const isMidnightPlaceholder = (time: string | null) =>
    time === "00:00" && !daySlots.some((s) => s.time.startsWith("00:00"));

  if (slot_time && !isMidnightPlaceholder(slot_time)) {
    const exact = daySlots.find((s) => s.time.slice(0, 5) === slot_time);
    if (exact) return pick(exact);

    const hour = Number(slot_time.split(":")[0]);
    const sameHour = daySlots.find(
      (s) => Number(s.time.split(":")[0]) === hour,
    );
    if (sameHour) return pick(sameHour);
  }

  const hourHint = opts.slot_time.match(/(\d{1,2})\s*h/i);
  if (hourHint) {
    const hour = Number(hourHint[1]);
    const byHour = daySlots.find(
      (s) => Number(s.time.split(":")[0]) === hour,
    );
    if (byHour) return pick(byHour);
  }

  if (daySlots.length === 1) {
    return pick(daySlots[0]);
  }

  if (daySlots.length > 0) {
    return pick(daySlots[0]);
  }

  if (slot_time && !isMidnightPlaceholder(slot_time)) {
    return { slot_date, slot_time, matched: false };
  }

  throw new Error("Heure de rendez-vous introuvable");
}

export function combineBookingDateTime(date: string, time: string): string {
  const normalizedDate = normalizeSlotDate(date);
  const normalizedTime = normalizeSlotTime(time);
  if (!normalizedDate || !normalizedTime) {
    throw new Error(`Date/heure invalides (${date}, ${time})`);
  }
  return parisWallTimeToUtcIso(normalizedDate, normalizedTime);
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
