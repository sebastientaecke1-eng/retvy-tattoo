import Link from "next/link";
import { redirect } from "next/navigation";
import { SketchChat } from "@/components/sketch/sketch-chat";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import { loadSketchChatForPro } from "@/lib/sketch/chat-access";
import { fetchSketchMessages } from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserCached, getUserProAccessCached } from "@/lib/supabase/request-cache";
import { hasFeature } from "@/lib/stripe/plans";
import type { PlanTier } from "@/lib/stripe/plans";

export default async function ProSketchChatPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const user = await getUserCached();
  if (!user) redirect(`/connexion?next=/pro/dashboard/croquis/${bookingId}`);

  const admin = createAdminClient();
  if (!(await getUserProAccessCached(user.id))) redirect("/client/dashboard");

  const ctx = await loadSketchChatForPro(admin, user.id, bookingId);
  if (!ctx) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Réservation introuvable.</p>
        <Link href="/pro/dashboard/croquis" className="mt-4 inline-block">
          <Button variant="outline">Retour aux croquis</Button>
        </Link>
      </div>
    );
  }

  const messages = await fetchSketchMessages(admin, bookingId);

  // Résoudre le tier d'abonnement du pro
  const { data: proProfile } = await admin
    .from("pro_profiles")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .single();
  const tier = (proProfile?.subscription_tier ?? "free") as PlanTier;
  const has3DBody = hasFeature(tier, "has3DBody");

  return (
    <SketchChat
      role="pro"
      bookingId={bookingId}
      booking={ctx.booking as Booking}
      initialSketch={ctx.sketch as BookingSketch | null}
      initialMessages={messages}
      backHref="/pro/dashboard/croquis"
      has3DBody={has3DBody}
    />
  );
}
