import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

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
        <p className="text-xs uppercase tracking-widest text-amber-500/80">
          Espace pro
        </p>
        <p className="mt-2 font-medium text-zinc-100">
          {profile?.artist_name ?? "Mon studio"}
        </p>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          <Link
            href="/parametres"
            className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            Paramètres
          </Link>
          <Link
            href="/pro/dashboard"
            className="rounded-lg bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Vue d&apos;ensemble
          </Link>
          <Link
            href="/pro/inscription"
            className="rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            Compléter le profil
          </Link>
          {profile?.slug && (
            <Link
              href={`/ink/${profile.slug}`}
              className="rounded-lg px-3 py-2 text-zinc-500 hover:text-amber-400"
              target="_blank"
            >
              Profil public ↗
            </Link>
          )}
        </nav>
        <div className="mt-auto pt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between md:hidden">
          <SignOutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
