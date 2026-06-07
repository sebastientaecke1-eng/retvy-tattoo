import Link from "next/link";
import { redirect } from "next/navigation";
import { userHasProAccess } from "@/lib/auth";
import type { BookingSketch } from "@/lib/pro/sketches";
import type { Booking } from "@/lib/pro/bookings";
import { SketchesSection } from "@/components/pro/sketches-section";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProDashboardCroquisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/pro/dashboard/croquis");

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Aucun profil pro trouvé.</p>
        <Link href="/pro/inscription" className="mt-4 inline-block">
          <Button>Commencer l&apos;inscription</Button>
        </Link>
      </div>
    );
  }

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("booking_date", { ascending: true });

  const { data: sketches } = await admin
    .from("bookings_sketches")
    .select("*")
    .eq("pro_user_id", user.id);

  return (
    <SketchesSection
      bookings={(bookings ?? []) as Booking[]}
      initialSketches={(sketches ?? []) as BookingSketch[]}
    />
  );
}
