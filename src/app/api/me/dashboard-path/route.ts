import { NextResponse } from "next/server";
import { getDashboardPathForUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/supabase/bearer-user";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const bearerUser = await getBearerUser(request);
  let userId = bearerUser?.id;

  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const path = await getDashboardPathForUser(admin, userId);
  return NextResponse.json({ path });
}
