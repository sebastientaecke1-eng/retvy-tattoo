const API_BASE = "https://api-adresse.data.gouv.fr/search/";

export type GouvAddressProperties = {
  label: string;
  name: string;
  postcode: string;
  city: string;
  id?: string;
};

export type GouvAddressFeature = {
  properties: GouvAddressProperties;
};

type GouvSearchResponse = {
  features?: GouvAddressFeature[];
};

export async function searchGouvAddresses(
  query: string,
  limit = 5,
): Promise<GouvAddressFeature[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
  const res = await fetch(`${API_BASE}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Adresse API: ${res.status}`);
  }

  const data = (await res.json()) as GouvSearchResponse;
  return data.features ?? [];
}
