export type StudioLocationFields = {
  studio?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
};

export function formatCityPostal(
  city?: string | null,
  postalCode?: string | null,
): string | null {
  const c = city?.trim();
  const p = postalCode?.trim();
  if (!c) return null;
  return p ? `${c}, ${p}` : c;
}

export function formatStudioAddress(fields: StudioLocationFields): string {
  const cityLine = formatCityPostal(fields.city, fields.postal_code);
  return [fields.address, cityLine].filter(Boolean).join(", ");
}

export function buildMapsSearchQuery(
  fields: StudioLocationFields,
): string | null {
  const studio = fields.studio?.trim() ?? "";
  const address = fields.address?.trim() ?? "";
  const city = fields.city?.trim() ?? "";
  const postal = fields.postal_code?.trim() ?? "";
  const locality = [postal, city].filter(Boolean).join(" ");

  const parts = studio
    ? [studio, address, locality].filter(Boolean)
    : [address, locality].filter(Boolean);

  const query = parts.join(" ").trim();
  return query || null;
}

export function buildGoogleMapsEmbedUrl(
  fields: StudioLocationFields,
): string | null {
  const search = buildMapsSearchQuery(fields);
  if (!search) return null;
  const q = encodeURIComponent(search);
  return `https://maps.google.com/maps?q=${q}&hl=fr&z=16&iwloc=near&output=embed`;
}

/** Lien externe Google Maps (nouvel onglet). */
export function buildGoogleMapsOpenUrl(
  fields: StudioLocationFields,
): string | null {
  const search = buildMapsSearchQuery(fields);
  if (!search) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
}

export function hasStudioSection(
  fields: StudioLocationFields,
  photoCount: number,
): boolean {
  return (
    photoCount > 0 ||
    !!fields.studio?.trim() ||
    !!formatStudioAddress(fields) ||
    !!buildGoogleMapsEmbedUrl(fields)
  );
}

export const MAX_STUDIO_PHOTOS = 5;
