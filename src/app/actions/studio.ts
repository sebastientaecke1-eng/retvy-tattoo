"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasProAccess } from "@/lib/auth";
import { setActiveProfileId } from "@/lib/pro/active-profile";
import { getStudioProfiles, canAddArtist, createSubProfile } from "@/lib/pro/studio";
import type { PlanTier } from "@/lib/stripe/plans";

export async function switchProfile(profileId: string) {
  await setActiveProfileId(profileId);
  revalidatePath("/pro/dashboard", "layout");
}

export async function addArtistAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) redirect("/client/dashboard");

  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status, subscription_tier, is_sub_profile")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const tier: PlanTier = (subData?.subscription_tier as PlanTier | null | undefined) ?? "1";

  const profiles = await getStudioProfiles(admin, user.id);
  if (!canAddArtist(profiles.length, tier)) {
    return { error: `Votre plan permet ${tier === "23" ? "3" : "10"} artistes maximum.` };
  }

  const artistName = (formData.get("artist_name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();

  if (!artistName || !slug) return { error: "Nom et slug requis." };

  const { data: existing } = await admin
    .from("pro_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return { error: "Ce slug est déjà utilisé." };

  const newProfile = await createSubProfile(admin, user.id, { artist_name: artistName, slug });
  if (!newProfile) return { error: "Erreur lors de la création du profil." };

  revalidatePath("/pro/dashboard/artistes");
  return { success: true, profileId: newProfile.id };
}
