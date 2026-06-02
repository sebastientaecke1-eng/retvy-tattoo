function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name];
}

export function getSupabaseUrl(): string {
  const publicUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serverUrl = readEnv("SUPABASE_URL");
  const url = typeof window === "undefined" ? publicUrl ?? serverUrl : publicUrl;
  if (!url) throw new Error("URL Supabase manquante");
  return url;
}

export function getSupabaseAnonKey(): string {
  const publicAnon = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const publicPublishable = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serverPublishable = readEnv("SUPABASE_PUBLISHABLE_KEY");
  const key =
    typeof window === "undefined"
      ? publicAnon ?? publicPublishable ?? serverPublishable
      : publicAnon ?? publicPublishable;
  if (!key) throw new Error("Clé anon Supabase manquante");
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return key;
}
