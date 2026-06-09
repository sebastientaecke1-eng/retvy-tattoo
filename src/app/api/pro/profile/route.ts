import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveProfileCoordinates } from "@/lib/pro/geocode-profile";
import { profilePatchSchema } from "@/lib/pro/profile-patch-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProRole } from "@/lib/supabase/ensure-pro-role";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";

const bodySchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  artist_name: z.string().min(1).max(120),
  studio: z.string().max(120).nullable().optional(),
  city: z.string().min(1).max(120),
  address: z.string().max(240).nullable().optional(),
  postal_code: z
    .string()
    .regex(/^\d{5}$/, "Code postal invalide")
    .nullable()
    .optional(),
  phone: z.string().min(1).max(40),
  styles: z.array(z.string().min(1).max(60)).min(1).max(20),
  slug: z.string().regex(/^[a-z0-9]{3,32}$/),
});

export async function GET(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("pro_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: portfolio } = await admin
    .from("pro_portfolio")
    .select("id, style, image_url, position, created_at")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({ profile, portfolio: portfolio ?? [] });
}

export async function PATCH(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof profilePatchSchema>;
  try {
    body = profilePatchSchema.parse(await request.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Données invalides";
    return NextResponse.json({ error: msg ?? "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("pro_profiles")
    .select("user_id, address, postal_code, city, latitude, longitude")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Profil pro introuvable" }, { status: 404 });
  }

  const coords = await resolveProfileCoordinates(admin, user.id, body, existing);

  console.log("[api/pro/profile] PATCH geocode", {
    userId: user.id,
    geocodeQuery: coords.geocodeQuery,
    geocoded: coords.geocoded,
    provider: coords.provider,
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

  const { data: row, error } = await admin
    .from("pro_profiles")
    .update({
      ...body,
      latitude: coords.latitude,
      longitude: coords.longitude,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("[api/pro/profile] PATCH", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[api/pro/profile] PATCH saved coordinates", {
    userId: user.id,
    latitude: row?.latitude,
    longitude: row?.longitude,
  });

  return NextResponse.json({ ok: true, profile: row });
}

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);

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
  const coords = await resolveProfileCoordinates(admin, user.id, {
    address: body.address ?? null,
    postal_code: body.postal_code ?? null,
    city: body.city,
  });

  console.log("[api/pro/profile] POST geocode", {
    userId: user.id,
    geocodeQuery: coords.geocodeQuery,
    geocoded: coords.geocoded,
    provider: coords.provider,
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

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
        postal_code: body.postal_code ?? null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        phone: body.phone,
        styles: body.styles,
        slug: body.slug,
        status: "pending_payment",
      },
      { onConflict: "user_id" },
    )
    .select("slug, artist_name, latitude, longitude")
    .single();

  if (error) {
    console.error("[api/pro/profile] pro_profiles", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[api/pro/profile] POST saved coordinates", {
    userId: user.id,
    latitude: row?.latitude,
    longitude: row?.longitude,
  });

  const roleResult = await ensureProRole(admin, user.id);

  if (!roleResult.ok) {
    console.error("[api/pro/profile] user_roles", roleResult.code, roleResult.message);
    return NextResponse.json(
      {
        error: "Profil créé mais rôle pro non enregistré.",
        detail: roleResult.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slug: row?.slug });
}
