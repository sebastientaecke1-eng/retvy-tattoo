import { createAdminClient } from "@/lib/supabase/admin";
import {
  sketchErrorPage,
  sketchRevisionFormPage,
  sketchSuccessPage,
} from "@/lib/sketch/html-response";

async function findSketchByToken(token: string) {
  const admin = createAdminClient();
  return admin
    .from("bookings_sketches")
    .select("id, status")
    .eq("validation_token", token)
    .maybeSingle();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token?.trim()) {
    return sketchErrorPage("Lien invalide", "Ce lien est invalide.");
  }

  const url = new URL(request.url);
  const comment = url.searchParams.get("comment")?.trim();

  const { data: sketch, error } = await findSketchByToken(token);

  if (error || !sketch) {
    return sketchErrorPage(
      "Lien introuvable",
      "Ce lien a expiré ou n'existe plus.",
    );
  }

  if (sketch.status === "approved") {
    return sketchSuccessPage(
      "Déjà validé",
      "Ce croquis a déjà été validé.",
    );
  }

  if (sketch.status === "revision_requested") {
    return sketchSuccessPage(
      "Demande enregistrée",
      "Votre demande de modification a déjà été transmise au tatoueur.",
    );
  }

  if (sketch.status !== "sent") {
    return sketchErrorPage(
      "Action impossible",
      "Ce croquis n'est pas en attente de réponse.",
    );
  }

  if (!comment) {
    return sketchRevisionFormPage(token);
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("bookings_sketches")
    .update({
      status: "revision_requested",
      client_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sketch.id);

  if (updateError) {
    return sketchErrorPage(
      "Erreur",
      "Impossible d'enregistrer votre demande. Réessayez plus tard.",
    );
  }

  return sketchSuccessPage(
    "Demande envoyée",
    "Votre tatoueur a reçu votre demande de modification et reviendra vers vous.",
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token?.trim()) {
    return sketchErrorPage("Lien invalide", "Ce lien est invalide.");
  }

  let comment = "";
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { comment?: string };
      comment = body.comment?.trim() ?? "";
    } catch {
      return sketchErrorPage("Erreur", "Corps de requête invalide.");
    }
  } else {
    const form = await request.formData();
    comment = String(form.get("comment") ?? "").trim();
  }

  if (!comment) {
    return sketchErrorPage(
      "Commentaire requis",
      "Merci de décrire les modifications souhaitées.",
    );
  }

  const { data: sketch, error } = await findSketchByToken(token);

  if (error || !sketch) {
    return sketchErrorPage(
      "Lien introuvable",
      "Ce lien a expiré ou n'existe plus.",
    );
  }

  if (sketch.status !== "sent") {
    return sketchErrorPage(
      "Action impossible",
      "Ce croquis n'est pas en attente de réponse.",
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("bookings_sketches")
    .update({
      status: "revision_requested",
      client_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sketch.id);

  if (updateError) {
    return sketchErrorPage(
      "Erreur",
      "Impossible d'enregistrer votre demande. Réessayez plus tard.",
    );
  }

  return sketchSuccessPage(
    "Demande envoyée",
    "Votre tatoueur a reçu votre demande de modification et reviendra vers vous.",
  );
}
