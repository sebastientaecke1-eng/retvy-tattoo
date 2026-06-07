import { createAdminClient } from "@/lib/supabase/admin";
import {
  sketchErrorPage,
  sketchSuccessPage,
} from "@/lib/sketch/html-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token?.trim()) {
    return sketchErrorPage("Lien invalide", "Ce lien de validation est invalide.");
  }

  const admin = createAdminClient();
  const { data: sketch, error } = await admin
    .from("bookings_sketches")
    .select("id, status")
    .eq("validation_token", token)
    .maybeSingle();

  if (error || !sketch) {
    return sketchErrorPage(
      "Lien introuvable",
      "Ce lien a expiré ou n'existe plus.",
    );
  }

  if (sketch.status === "approved") {
    return sketchSuccessPage(
      "Déjà validé",
      "Vous avez déjà validé ce croquis. Merci !",
    );
  }

  if (sketch.status !== "sent") {
    return sketchErrorPage(
      "Action impossible",
      "Ce croquis n'est pas en attente de validation.",
    );
  }

  const { error: updateError } = await admin
    .from("bookings_sketches")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sketch.id);

  if (updateError) {
    return sketchErrorPage(
      "Erreur",
      "Impossible d'enregistrer votre validation. Réessayez plus tard.",
    );
  }

  return sketchSuccessPage(
    "Croquis validé ✅",
    "Merci ! Votre tatoueur a été informé de votre validation.",
  );
}
