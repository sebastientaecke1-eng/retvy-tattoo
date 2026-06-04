import type { User } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { createClient } from "./server";

/** Valide un access_token via l'API Auth (fiable sur Cloudflare Workers). */
async function getUserFromAccessToken(accessToken: string): Promise<User | null> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, "");
  const apikey = getSupabaseAnonKey();

  const res = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey,
    },
  });

  if (!res.ok) {
    console.warn(
      "[auth] GET /auth/v1/user failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }

  return (await res.json()) as User;
}

/**
 * Résout l'utilisateur depuis une Route Handler :
 * 1. Bearer access_token (envoyé par le wizard) — prioritaire sur Workers
 * 2. Cookies de session Supabase (getUser sans JWT)
 */
export async function resolveRequestUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    const fromBearer = await getUserFromAccessToken(bearer);
    if (fromBearer) return fromBearer;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.warn("[auth] getUser(cookies):", error.message);
  }
  return user ?? null;
}
