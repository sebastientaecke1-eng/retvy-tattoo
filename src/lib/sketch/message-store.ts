import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { SketchMessage } from "@/lib/sketch/messages";

type Admin = SupabaseClient<Database>;

export async function fetchSketchMessages(
  admin: Admin,
  bookingId: string,
): Promise<SketchMessage[]> {
  const { data, error } = await admin
    .from("sketch_messages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[sketch-messages] fetch", error.message);
    return [];
  }

  return (data ?? []) as SketchMessage[];
}

export async function insertSketchMessage(
  admin: Admin,
  payload: {
    booking_id: string;
    sender_role: "pro" | "client";
    message?: string | null;
    image_url?: string | null;
  },
): Promise<SketchMessage | null> {
  const { data, error } = await admin
    .from("sketch_messages")
    .insert({
      booking_id: payload.booking_id,
      sender_role: payload.sender_role,
      message: payload.message?.trim() || null,
      image_url: payload.image_url ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[sketch-messages] insert", error.message);
    return null;
  }

  return data as SketchMessage;
}
