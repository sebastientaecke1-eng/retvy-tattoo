import type { User } from "@supabase/supabase-js";
import {
  EXTERNAL_REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
} from "@/lib/http/with-timeout";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/** Utilisateur depuis Authorization: Bearer (adapté Workers, sans cookies). */
export async function getBearerUser(
  request: Request,
  timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS,
): Promise<User | null> {
  const authHeader = request.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  if (!bearer) return null;

  const baseUrl = getSupabaseUrl().replace(/\/$/, "");
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
          apikey: getSupabaseAnonKey(),
        },
      },
      timeoutMs,
    );
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
}
