import Link from "next/link";
import { redirect } from "next/navigation";
import { SketchChat } from "@/components/sketch/sketch-chat";
import { Button } from "@/components/ui/button";
import { userHasProAccess } from "@/lib/auth";
import type { Booking } from "@/lib/pro/bookings";
import type { BookingSketch } from "@/lib/pro/sketches";
import { loadSketchChatForPro } from "@/lib/sketch/chat-access";
import { fetchSketchMessages } from "@/lib/sketch/message-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProSketchChatPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/pro/dashboard/croquis/${bookingId}`);

  const admin = createAdminClient();
  if (!(await userHasProAccess(admin, user.id))) {
    redirect("/client/dashboard");
  }

  const ctx = await loadSketchChatForPro(admin, user.id, bookingId);
  if (!ctx) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="text-zinc-400">Réservation introuvable.</p>
        <Link href="/pro/dashboard/croquis" className="mt-4 inline-block">
          <Button variant="outline">Retour aux croquis</Button>
        </Link>
      </div>
    );
  }

  const messages = await fetchSketchMessages(admin, bookingId);

  return (
    <SketchChat
      role="pro"
      bookingId={bookingId}
      booking={ctx.booking as Booking}
      initialSketch={ctx.sketch as BookingSketch | null}
      initialMessages={messages}
      backHref="/pro/dashboard/croquis"
    />
  );
}
