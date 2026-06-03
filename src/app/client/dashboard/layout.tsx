import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

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

  const name =
    (user.user_metadata?.first_name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-500/80">
            Espace client
          </p>
          <p className="mt-1 text-lg font-medium">{name}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/parametres"
            className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400"
          >
            Paramètres
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400"
          >
            Accueil
          </Link>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
