import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ClientDashboardNav } from "@/components/client/client-dashboard-nav";

export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/client/dashboard");

  const isAdminViewingAsClient = user.email === "sebastientaecke1@gmail.com";

  const name =
    (user.user_metadata?.first_name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0];

  return (
    <>
      {isAdminViewingAsClient && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
          <span>👁 Mode aperçu — vue client</span>
          <a
            href="/admin"
            className="rounded-full bg-emerald-950/20 px-3 py-1 text-xs font-bold hover:bg-emerald-950/30 transition-colors"
          >
            ← Retour admin
          </a>
        </div>
      )}
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl gap-0 px-4 py-8 md:gap-8">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-200 pr-6 dark:border-zinc-900 md:flex">
        <p className="text-xs uppercase tracking-widest text-[#0057FF]">
          Espace client
        </p>
        <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
        <ClientDashboardNav />
        <div className="mt-auto pt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-900 md:hidden">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#0057FF]">
              Espace client
            </p>
            <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/client/dashboard/parametres"
              className="text-sm text-zinc-500 hover:text-[#0057FF]"
            >
              Paramètres
            </Link>
            <SignOutButton />
          </div>
        </div>
        <div className="mb-6 hidden md:block">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-[#0057FF]"
          >
            Accueil
          </Link>
        </div>
        {children}
      </div>
    </div>
    </>
  );
}
