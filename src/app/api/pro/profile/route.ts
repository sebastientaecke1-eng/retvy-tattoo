import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveProfileCoordinates } from "@/lib/pro/geocode-profile";
import { profilePatchSchema } from "@/lib/pro/profile-patch-schema";
import {
  fetchProStyleIds,
  fetchTattooStyleCatalogAdmin,
  syncProStyles,
} from "@/lib/pro/tattoo-style-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProRole } from "@/lib/supabase/ensure-pro-role";
import { resolveRequestUser } from "@/lib/supabase/resolve-request-user";
import {
  formatZodIssues,
  PROFILE_PATCH_LABELS,
  PROFILE_POST_LABELS,
} from "@/lib/zod/format-issues";

const styleIdsSchema = z
  .array(z.string().uuid({ error: "Identifiant de style invalide" }))
  .min(1, "Sélectionnez au moins un style")
  .max(100, "Trop de styles sélectionnés");

const bodySchema = z.object({
  first_name: z
    .string({ error: "Le prénom est requis" })
    .min(1, "Le prénom est requis")
    .max(80, "Prénom trop long"),
  last_name: z
    .string({ error: "Le nom est requis" })
    .min(1, "Le nom est requis")
    .max(80, "Nom trop long"),
  artist_name: z
    .string({ error: "Le nom d'artiste est requis" })
    .min(1, "Le nom d'artiste est requis")
    .max(120, "Nom d'artiste trop long"),
  studio: z.string().max(120, "Nom de studio trop long").nullable().optional(),
  city: z
    .string({ error: "La ville est requise" })
    .min(1, "La ville est requise")
    .max(120, "Ville trop longue"),
  address: z.string().max(240, "Adresse trop longue").nullable().optional(),
  postal_code: z
    .string()
    .regex(/^\d{5}$/, "Code postal invalide")
    .nullable()
    .optional(),
  phone: z
    .string({ error: "Le téléphone est requis" })
    .min(1, "Le téléphone est requis")
    .max(40, "Téléphone trop long"),
  style_ids: styleIdsSchema,
  slug: z
    .string({ error: "Le slug est requis" })
    .regex(/^[a-z0-9]{3,32}$/, "Slug invalide : 3 à 32 caractères, a-z et 0-9"),
});

function zodValidationResponse(error: unknown, labels: Record<string, string>) {
  if (error instanceof z.ZodError) {
    const formatted = formatZodIssues(error, labels);
    console.error("[api/pro/profile] validation failed", {
      issues: formatted.issues,
    });
    return NextResponse.json(
      { error: formatted.message, issues: formatted.issues },
      { status: 400 },
    );
  }
  console.error("[api/pro/profile] invalid JSON body", error);
  return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
}

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

  const [{ data: portfolio }, proStyleIds] = await Promise.all([
    admin
      .from("pro_portfolio")
      .select("id, style, image_url, position, created_at")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    profile?.id ? fetchProStyleIds(admin, profile.id) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    profile,
    portfolio: portfolio ?? [],
    pro_style_ids: proStyleIds,
  });
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
    return zodValidationResponse(e, PROFILE_PATCH_LABELS);
  }

  const { style_ids: styleIds, ...profileFields } = body;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("pro_profiles")
    .select("id, user_id, address, postal_code, city, latitude, longitude")
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
      ...profileFields,
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

  if (styleIds) {
    const catalog = await fetchTattooStyleCatalogAdmin(admin);
    const validIds = new Set(catalog.styleById.keys());
    const invalid = styleIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "Style invalide" }, { status: 400 });
    }
    await syncProStyles(admin, existing.id, styleIds);
  }

  const proStyleIds = await fetchProStyleIds(admin, existing.id);

  console.log("[api/pro/profile] PATCH saved coordinates", {
    userId: user.id,
    latitude: row?.latitude,
    longitude: row?.longitude,
  });

  return NextResponse.json({ ok: true, profile: row, pro_style_ids: proStyleIds });
}

export async function POST(request: Request) {
  const user = await resolveRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    return zodValidationResponse(e, PROFILE_POST_LABELS);
  }

  const { style_ids: styleIds, ...profileBody } = body;

  const admin = createAdminClient();
  const catalog = await fetchTattooStyleCatalogAdmin(admin);
  const validIds = new Set(catalog.styleById.keys());
  const invalid = styleIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "Style invalide" }, { status: 400 });
  }

  const coords = await resolveProfileCoordinates(admin, user.id, {
    address: profileBody.address ?? null,
    postal_code: profileBody.postal_code ?? null,
    city: profileBody.city,
  });

  console.log("[api/pro/profile] POST geocode", {
    userId: user.id,
    geocodeQuery: coords.geocodeQuery,
    geocoded: coords.geocoded,
    provider: coords.provider,
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

  // Chercher le profil principal existant (is_sub_profile = false)
  const { data: existing } = await admin
    .from("pro_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const profilePayload = {
    user_id: user.id,
    first_name: profileBody.first_name,
    last_name: profileBody.last_name,
    artist_name: profileBody.artist_name,
    studio: profileBody.studio ?? null,
    city: profileBody.city,
    address: profileBody.address ?? null,
    postal_code: profileBody.postal_code ?? null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    phone: profileBody.phone,
    styles: [],
    slug: profileBody.slug,
    status: "pending_payment",
    is_sub_profile: false,
  };

  let row: { id: string; slug: string; artist_name: string; latitude: number | null; longitude: number | null } | null = null;
  let error: { message: string } | null = null;

  if (existing?.id) {
    // Mettre à jour le profil existant
    const { data, error: updateErr } = await admin
      .from("pro_profiles")
      .update(profilePayload)
      .eq("id", existing.id)
      .select("id, slug, artist_name, latitude, longitude")
      .single();
    row = data;
    error = updateErr;
  } else {
    // Créer un nouveau profil principal
    const { data, error: insertErr } = await admin
      .from("pro_profiles")
      .insert(profilePayload)
      .select("id, slug, artist_name, latitude, longitude")
      .single();
    row = data;
    error = insertErr;
  }

  if (error) {
    console.error("[api/pro/profile] pro_profiles", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row?.id) {
    return NextResponse.json({ error: "Profil non créé" }, { status: 500 });
  }

  await syncProStyles(admin, row.id, styleIds);

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
