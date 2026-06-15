import Link from "next/link";
import { redirect } from "next/navigation";
import { SketchChat } from "@/components/sketch/sketch-chat";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import { loadSketchChatForClient } from "@/lib/sketch/chat-access";
import { fetchSketchMessages } from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ClientSketchChatPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/client/dashboard/croquis/${bookingId}`);

  const admin = createAdminClient();
  const ctx = await loadSketchChatForClient(admin, user, bookingId);
  if (!ctx) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Réservation introuvable.</p>
        <Link href="/client/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Retour au dashboard</Button>
        </Link>
      </div>
    );
  }

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("artist_name")
    .eq("user_id", ctx.booking.user_id)
    .maybeSingle();

  const messages = await fetchSketchMessages(admin, bookingId);

  return (
    <SketchChat
      role="client"
      bookingId={bookingId}
      booking={ctx.booking as Booking}
      initialSketch={ctx.sketch as BookingSketch | null}
      initialMessages={messages}
      backHref="/client/dashboard"
      artistName={profile?.artist_name ?? "Tatoueur"}
    />
  );
}
