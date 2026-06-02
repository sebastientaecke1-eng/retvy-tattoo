import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search } from "lucide-react";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.first_name as string) ||
    user?.email?.split("@")[0] ||
    "Client";

  return (
    <>
      <h1 className="mt-8 text-2xl font-bold">Bonjour, {displayName}</h1>
      <p className="text-zinc-500">Vos projets et rendez-vous Retvy</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex gap-4 pt-6">
            <MessageSquare className="h-8 w-8 shrink-0 text-amber-400" />
            <div>
              <h2 className="font-medium">Qualifier un projet</h2>
              <p className="mt-1 text-sm text-zinc-500">
                L&apos;assistant IA affine votre brief tatouage ou piercing.
              </p>
              <Link href="/#chat" className="mt-3 inline-block">
                <Button size="sm">Ouvrir le chat</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-4 pt-6">
            <Search className="h-8 w-8 shrink-0 text-amber-400" />
            <div>
              <h2 className="font-medium">Artistes recommandés</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Matching selon votre projet — bientôt disponible.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
