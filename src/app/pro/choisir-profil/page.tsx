import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasProAccess } from "@/lib/auth";
import { getStudioProfiles } from "@/lib/pro/studio";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfilePicker } from "./profile-picker";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ChoisirProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/choisir-profil");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: subData } = await admin
    .from("pro_profiles")
    .select("subscription_status")
    .eq("user_id", user.id)
    .eq("is_sub_profile", false)
    .maybeSingle();

  const raw = subData?.subscription_status ?? "";
  const tier: PlanTier = raw.includes("3plus")
    ? "3plus"
    : raw.includes("23")
    ? "23"
    : "1";

  if (tier === "1") redirect("/pro/dashboard");

  const profiles = await getStudioProfiles(admin, user.id);
  if (profiles.length <= 1) redirect("/pro/dashboard");

  const mainProfile = profiles.find((p) => !p.is_sub_profile) ?? profiles[0];
  const tierLabel = tier === "3plus" ? "3+ tatoueurs" : "2–3 tatoueurs";

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#080810] px-6 text-zinc-100">
      <nav className="flex w-full max-w-3xl items-center justify-between py-7">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight"
        >
          Ret<span className="text-[#4060ff]">vy</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-[#4060ff]/25 bg-[#4060ff]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#4060ff]">
            Plan {tierLabel}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center gap-12 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            Quel profil ?
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Choisissez le compte artiste à gérer
          </p>
        </div>

        <ProfilePicker
          profiles={profiles}
          tier={tier}
          mainProfileId={mainProfile.id}
        />
      </main>
    </div>
  );
}
