export type ColorPreference = "color" | "black_and_grey" | "undecided";

export function colorPreferenceLabel(value: string | null | undefined): string {
  switch (value) {
    case "color":
      return "Couleur";
    case "black_and_grey":
      return "Noir et gris";
    case "undecided":
      return "Pas encore décidé";
    default:
      return value?.trim() || "—";
  }
}

export function normalizeColorPreference(text: string): ColorPreference | null {
  const t = text.trim().toLowerCase();
  if (/couleur|color/i.test(t) && !/noir|gris|nb|n&b/i.test(t)) return "color";
  if (/noir|gris|n&b|black/i.test(t)) return "black_and_grey";
  if (/pas encore|indécis|undecided|je ne sais/i.test(t)) return "undecided";
  return null;
}
