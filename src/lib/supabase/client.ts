import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

function readPublicEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name];
}

export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}

export function getBrowserSupabaseEnvError(): string | null {
  const url = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey =
    readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readPublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (url && anonKey) return null;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey)
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");

  return `Configuration manquante côté client (${missing.join(", ")}). Ajoutez ces variables au build OpenNext et au runtime Cloudflare.`;
}

export function createClientOrNull() {
  const envError = getBrowserSupabaseEnvError();
  if (envError) return null;
  return createClient();
}
