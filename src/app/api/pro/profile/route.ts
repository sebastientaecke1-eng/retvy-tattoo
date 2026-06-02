import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  artist_name: z.string().min(1).max(120),
  studio: z.string().max(120).nullable().optional(),
  city: z.string().min(1).max(120),
  address: z.string().max(240).nullable().optional(),
  phone: z.string().min(1).max(40),
  styles: z.array(z.string().min(1).max(60)).min(1).max(20),
  slug: z.string().regex(/^[a-z0-9]{3,32}$/),
});

async function resolveUser(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return null;

  const {
    data: { user: tokenUser },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !tokenUser) return null;
  return tokenUser;
}

export async function POST(request: Request) {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("pro_profiles")
    .upsert(
      {
        user_id: user.id,
        first_name: body.first_name,
        last_name: body.last_name,
        artist_name: body.artist_name,
        studio: body.studio ?? null,
        city: body.city,
        address: body.address ?? null,
        phone: body.phone,
        styles: body.styles,
        slug: body.slug,
        status: "pending_payment",
      },
      { onConflict: "user_id" },
    )
    .select("slug, artist_name")
    .single();

  if (error) {
    console.error("[api/pro/profile] pro_profiles", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: roleError } = await admin.from("user_roles").upsert(
    { user_id: user.id, role: "pro" },
    { onConflict: "user_id,role" },
  );

  if (roleError) {
    console.error("[api/pro/profile] user_roles", roleError);
    return NextResponse.json(
      { error: "Profil créé mais rôle pro non enregistré. Réessayez." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slug: row?.slug });
}
