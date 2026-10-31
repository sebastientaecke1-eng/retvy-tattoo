import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioProfiles } from "@/lib/pro/studio";
import { getMaxArtists } from "@/lib/stripe/plans";
import type { PlanTier } from "@/lib/stripe/plans";
import { ArtistesClient } from "./artistes-client";
import { getUserCached, getUserProAccessCached } from "@/lib/supabase/request-cache";

export default async function ArtistesPage() {
  const user = await getUserCached();
  if (!user) redirect("/connexion?next=/pro/dashboard/artistes");

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const profiles = await getStudioProfiles(admin, user.id);

  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status, subscription_tier, is_sub_profile")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const tier: PlanTier = (subData?.subscription_tier as PlanTier | null | undefined) ?? "free";
  const maxArtists = getMaxArtists(tier);

  return (
    <ArtistesClient
      profiles={profiles}
      maxArtists={maxArtists}
      canAdd={profiles.length < maxArtists}
    />
  );
}
