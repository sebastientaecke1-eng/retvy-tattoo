import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProDashboardNav } from "@/components/pro/pro-dashboard-nav";

export default async function ProDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name, slug, subscription_status, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl gap-0 px-4 py-8 md:gap-8">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-900 pr-6 md:flex">
        <p className="text-xs uppercase tracking-widest text-blue-500/80">
          Espace pro
        </p>
        <p className="mt-2 font-medium text-zinc-100">
          {profile?.artist_name ?? "Mon studio"}
        </p>
        <ProDashboardNav />
        <div className="mt-auto pt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-end gap-2 md:hidden">
          <Link
            href="/pro/dashboard/parametres"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-[#0057FF]"
            aria-label="Paramètres"
            title="Paramètres"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <SignOutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
