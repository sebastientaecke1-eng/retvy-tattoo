export const PRO_STYLE_OPTIONS = [
  { id: "japonais", label: "Japonais" },
  { id: "realisme", label: "Réalisme" },
  { id: "blackwork", label: "Blackwork" },
  { id: "fineline", label: "Fineline" },
  { id: "minimaliste", label: "Minimaliste" },
  { id: "geometrique", label: "Géométrique" },
  { id: "aquarelle", label: "Aquarelle" },
  { id: "old-school", label: "Old school" },
  { id: "tribal", label: "Tribal" },
  { id: "dotwork", label: "Dotwork" },
  { id: "lettering", label: "Lettering" },
  { id: "neo-traditionnel", label: "Néo-traditionnel" },
] as const;

export type ProStyleId = (typeof PRO_STYLE_OPTIONS)[number]["id"];

export const PRO_STYLE_IDS = PRO_STYLE_OPTIONS.map((s) => s.id);

export function isProStyleId(value: string): value is ProStyleId {
  return (PRO_STYLE_IDS as readonly string[]).includes(value);
}
