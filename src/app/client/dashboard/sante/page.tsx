import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientHealthProfileForm } from "@/components/client/client-health-profile-form";

export default async function ClientSantePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/client/dashboard/sante");

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Fiche santé
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Informations médicales transmises à votre tatoueur avant la séance.
        </p>
      </div>
      <ClientHealthProfileForm userId={user.id} />
    </div>
  );
}
