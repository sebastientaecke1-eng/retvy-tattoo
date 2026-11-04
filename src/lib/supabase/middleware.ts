import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const ADMIN_EMAIL = "sebastientaecke1@gmail.com";

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
  const viewAsPro = request.cookies.get("retvy_view_as_pro")?.value === "true";

  // ── Redirection admin ─────────────────────────────────────────────────────
  // L'admin est redirigé vers /admin partout, SAUF :
  //   - les routes /api (sinon les API ne fonctionnent pas)
  //   - /admin lui-même
  //   - /client/dashboard (permet de "voir comme client" sans cookie)
  //   - /pro/dashboard en mode "voir comme pro"
  if (user && user.email === ADMIN_EMAIL && !viewAsPro) {
    const isAllowed =
      path.startsWith("/admin") ||
      path.startsWith("/api") ||
      path.startsWith("/client/dashboard") ||
      path.startsWith("/pro/dashboard");

    if (!isAllowed) {
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

    // Les pro sont redirigés vers /pro/dashboard SAUF si c'est l'admin
    // (l'admin peut accéder à /client/dashboard librement)
    if (
      path.startsWith("/client/dashboard") &&
      hasPro &&
      user.email !== ADMIN_EMAIL
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/pro/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
