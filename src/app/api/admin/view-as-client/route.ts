import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "sebastientaecke1@gmail.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "enter") {
    const res = NextResponse.redirect(new URL("/client/dashboard", req.url));
    res.cookies.set("retvy_view_as_client", "true", {
      path: "/",
      maxAge: 60 * 60 * 4, // 4h
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  }

  // exit
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set("retvy_view_as_client", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
