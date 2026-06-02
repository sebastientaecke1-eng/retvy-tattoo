import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  isValidSupabasePublicConfig,
} from "./public-config";

export function getBrowserSupabaseEnvError(): string | null {
  if (isValidSupabasePublicConfig()) return null;
  return "Configuration Supabase manquante (URL ou clé anon).";
}

export function createClientOrNull() {
  if (!isValidSupabasePublicConfig()) return null;
  return createBrowserClient<Database>(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
  );
}

export function createClient() {
  const client = createClientOrNull();
  if (!client) {
    throw new Error(
      getBrowserSupabaseEnvError() ?? "Configuration Supabase manquante.",
    );
  }
  return client;
}
