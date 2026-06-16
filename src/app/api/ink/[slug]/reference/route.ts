import { NextResponse } from "next/server";
import { analyzeReferenceImage } from "@/lib/ink/analyze-reference-image";
import { fetchPublicProProfileBySlug } from "@/lib/pro/public-profile";
import { storagePublicUrl } from "@/lib/pro/storage-public-url";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "booking-references";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = await fetchPublicProProfileBySlug(slug);
  if (!profile?.user_id) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (jpg, png, webp)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 Mo)" },
      { status: 400 },
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${slug}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[ink/reference] upload", uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const url = storagePublicUrl(BUCKET, path);
  const analysis = await analyzeReferenceImage(url);

  return NextResponse.json({ url, analysis });
}
