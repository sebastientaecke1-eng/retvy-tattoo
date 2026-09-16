import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pro_profiles")
      .select(
        "id, slug, artist_name, studio, city, styles, avatar_url, cover_url, bio, price_min, price_max, latitude, longitude, is_sub_profile, status"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, artists: [] }, { status: 500 });
    }

    return NextResponse.json({ ok: true, artists: data ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      artists: [],
    }, { status: 500 });
  }
}
