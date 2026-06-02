import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.toLowerCase();
  if (!slug || !/^[a-z0-9]{3,32}$/.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("pro_profiles_public")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
