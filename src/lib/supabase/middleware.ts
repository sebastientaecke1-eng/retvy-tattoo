import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const ADMIN_EMAIL = "sebastientaecke1@gmail.com";
const COOKIE_CLIENT = "retvy_view_as_client";
const COOKIE_PRO    = "retvy_view_as_pro";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 4, // 4h
  httpOnly: true,
  sameSite: "lax" as const,
};

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
  const params = request.nextUrl.searchParams;

  // ─── Gestion des modes admin directement dans le middleware ───────────────
  // ?enter_client_view=1 → active le mode vue client
  // ?exit_client_view=1  → désactive le mode vue client
  if (user && user.email === ADMIN_EMAIL) {
    if (params.get("enter_client_view") === "1") {
      const dest = request.nextUrl.clone();
      dest.searchParams.delete("enter_client_view");
      const res = NextResponse.redirect(dest);
      res.cookies.set(COOKIE_CLIENT, "true", COOKIE_OPTS);
      res.cookies.set(COOKIE_PRO, "", { path: "/", maxAge: 0 }); // reset pro si actif
      return res;
    }
    if (params.get("exit_client_view") === "1") {
      const dest = request.nextUrl.clone();
      dest.searchParams.delete("exit_client_view");
      dest.pathname = "/admin";
      const res = NextResponse.redirect(dest);
      res.cookies.set(COOKIE_CLIENT, "", { path: "/", maxAge: 0 });
      return res;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const viewAsPro    = request.cookies.get(COOKIE_PRO)?.value === "true";
  const viewAsClient = request.cookies.get(COOKIE_CLIENT)?.value === "true";

  // Redirection admin → /admin (sauf modes spéciaux et routes API)
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
