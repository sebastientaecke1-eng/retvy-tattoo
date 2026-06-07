export type SketchStatus =
  | "pending"
  | "sent"
  | "approved"
  | "revision_requested";

export type BookingSketch = {
  id: string;
  booking_id: string;
  pro_user_id: string;
  client_email: string;
  sketch_url: string | null;
  storage_path: string | null;
  status: SketchStatus;
  client_comment: string | null;
  validation_token: string;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<
  SketchStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente d'envoi",
    className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  },
  sent: {
    label: "Envoyé — en attente de réponse client",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  approved: {
    label: "Validé par le client ✅",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  revision_requested: {
    label: "Modification demandée ❌",
    className: "border-red-500/40 bg-red-500/10 text-red-400",
  },
};

export function getSketchStatusMeta(status: SketchStatus) {
  return STATUS_META[status];
}

export function isSketchImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}
