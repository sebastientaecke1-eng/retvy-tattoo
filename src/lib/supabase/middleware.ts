import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Redirection admin (sauf si mode "voir comme pro" activé)
  const ADMIN_EMAIL = "sebastientaecke1@gmail.com";
  const viewAsPro = request.cookies.get("retvy_view_as_pro")?.value === "true";
  const viewAsClient = request.cookies.get("retvy_view_as_client")?.value === "true";

  if (user && user.email === ADMIN_EMAIL && !viewAsPro && !viewAsClient) {
    if (!path.startsWith("/admin") && !path.startsWith("/api")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }
  if (path.startsWith("/admin") && (!user || user.email !== ADMIN_EMAIL)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  const isProtected =
    path.startsWith("/pro/dashboard") || path.startsWith("/client/dashboard");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user) {
    const admin = createAdminClient();
    const hasPro = await userHasProAccess(admin, user.id);

    if (path.startsWith("/pro/dashboard") && !hasPro) {
      const url = request.nextUrl.clone();
      url.pathname = "/client/dashboard";
      return NextResponse.redirect(url);
    }

    if (path.startsWith("/client/dashboard") && hasPro && !viewAsClient) {
      const url = request.nextUrl.clone();
      url.pathname = "/pro/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
