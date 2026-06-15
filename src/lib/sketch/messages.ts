export type SketchMessage = {
  id: string;
  booking_id: string;
  sender_role: "pro" | "client";
  message: string | null;
  image_url: string | null;
  created_at: string;
};

export type SketchMessageRow = SketchMessage;
