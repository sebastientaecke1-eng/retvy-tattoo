import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasProAccess } from "@/lib/auth";
import { getStudioProfiles } from "@/lib/pro/studio";
import { getMaxArtists } from "@/lib/stripe/plans";
import type { PlanTier } from "@/lib/stripe/plans";
import { ArtistesClient } from "./artistes-client";

export default async function ArtistesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/artistes");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) redirect("/client/dashboard");

  const profiles = await getStudioProfiles(admin, user.id);

  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status, subscription_tier, is_sub_profile")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const tier: PlanTier = (subData?.subscription_tier as PlanTier | null | undefined) ?? "1";
  const maxArtists = getMaxArtists(tier);

  return (
    <ArtistesClient
      profiles={profiles}
      maxArtists={maxArtists}
      canAdd={profiles.length < maxArtists}
    />
  );
}
