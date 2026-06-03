/** Valeurs publiques Supabase — inlinées au build si valides, sinon repli prod. */
const DEFAULT_SUPABASE_URL = "https://xtwgjpjovkctfkymxzda.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_-i4pyt7dPuVwvkMTCukpNg_xvuUS_hG";

/** Build Cloudflare : ignorer .env.local et inliner les valeurs prod. */
function isCloudflareProductionBuild(): boolean {
  return process.env.CLOUDFLARE_BUILD === "1";
}

function readHttpUrl(name: string, fallback: string): string {
  if (isCloudflareProductionBuild()) return fallback;
  const raw = process.env[name]?.trim();
  if (raw && /^https?:\/\//i.test(raw)) return raw;
  return fallback;
}

function readAnonKey(name: string, fallback: string): string {
  if (isCloudflareProductionBuild()) return fallback;
  const raw = process.env[name]?.trim();
  if (raw && raw.length >= 20) return raw;
  return fallback;
}

export function getPublicSupabaseUrl(): string {
  return readHttpUrl("NEXT_PUBLIC_SUPABASE_URL", DEFAULT_SUPABASE_URL);
}

export function getPublicSupabaseAnonKey(): string {
  return readAnonKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY);
}

export function isValidSupabasePublicConfig(): boolean {
  const url = getPublicSupabaseUrl();
  const key = getPublicSupabaseAnonKey();
  return /^https?:\/\//i.test(url) && key.length >= 20;
}
