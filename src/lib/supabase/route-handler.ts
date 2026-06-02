import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function createRouteHandlerClient(
  response?: NextResponse,
) {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (response) {
            response.cookies.set(name, value, options);
          } else {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Lecture seule hors Route Handler
            }
          }
        });
      },
    },
  });
}

export type { EmailOtpType };
