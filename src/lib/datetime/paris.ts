/** Fuseau horaire métier Retvy (créneaux tatoueurs en France). */
export const BOOKING_TIMEZONE = "Europe/Paris";

export type ParisDateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

export function parisDateTimeParts(iso: string): ParisDateTimeParts {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/**
 * Convertit une date/heure « mur » Europe/Paris en ISO UTC pour `timestamptz`.
 * Ex. 2026-06-17 10:00 Paris → 2026-06-17T08:00:00.000Z (été UTC+2).
 */
export function parisWallTimeToUtcIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const parts = formatter.formatToParts(new Date(utcMs));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

    const pYear = get("year");
    const pMonth = get("month");
    const pDay = get("day");
    const pHour = get("hour") % 24;
    const pMinute = get("minute");

    if (
      pYear === year &&
      pMonth === month &&
      pDay === day &&
      pHour === hour &&
      pMinute === minute
    ) {
      return new Date(utcMs).toISOString();
    }

    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute);
    utcMs += desired - actual;
  }

  return new Date(utcMs).toISOString();
}

export function formatInParis(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: BOOKING_TIMEZONE,
    ...options,
  }).format(new Date(iso));
}

/** Clé YYYY-MM-DD en heure Paris (pour l'agenda). */
export function parisDayKey(iso: string): string {
  const p = parisDateTimeParts(iso);
  return `${p.year}-${p.month}-${p.day}`;
}
