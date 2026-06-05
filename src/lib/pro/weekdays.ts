export const WEEKDAYS = [
  { id: 0, label: "Lundi" },
  { id: 1, label: "Mardi" },
  { id: 2, label: "Mercredi" },
  { id: 3, label: "Jeudi" },
  { id: 4, label: "Vendredi" },
  { id: 5, label: "Samedi" },
  { id: 6, label: "Dimanche" },
] as const;

export type DayOfWeek = (typeof WEEKDAYS)[number]["id"];

export function toTimeInputValue(t: string): string {
  return t.slice(0, 5);
}

export function normalizeTimeForDb(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}
