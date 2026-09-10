"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setActiveProfileId } from "@/lib/pro/active-profile";

export async function selectProfileAction(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/choisir-profil");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("pro_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) throw new Error("Profil introuvable");

  await setActiveProfileId(profileId);
  redirect("/pro/dashboard");
}

/** Sélectionne le profil principal et redirige vers la page artistes. */
export async function goToAddArtistAction(mainProfileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("pro_profiles")
    .select("id")
    .eq("id", mainProfileId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) throw new Error("Profil introuvable");

  await setActiveProfileId(mainProfileId);
  redirect("/pro/dashboard/artistes");
}
