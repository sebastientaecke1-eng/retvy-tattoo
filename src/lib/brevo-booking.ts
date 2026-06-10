import { formatInParis, parisWallTimeToUtcIso } from "@/lib/datetime/paris";
import { CANCELLATION_OPTIONS } from "@/lib/pro/deposit-settings";
import { sendBrevoEmail } from "./brevo";

function escapeHtml(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function layout(title: string, inner: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#18181b;border:1px solid #3f3f46;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,rgba(245,158,11,0.2),transparent);padding:24px 32px 8px;">
          <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;">Retvy</p>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#fafafa;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 32px;color:#d4d4d8;font-size:15px;line-height:1.6;">
          ${inner}
          <p style="margin:28px 0 0;font-size:12px;color:#71717a;">— L'équipe Retvy</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(label)}</p>
<p style="margin:0 0 16px;font-size:14px;color:#fafafa;font-weight:500;">${escapeHtml(value || "—")}</p>`;
}

export function formatBookingDateTimeParis(
  slotDate: string,
  slotTime: string,
): string {
  try {
    const iso = parisWallTimeToUtcIso(slotDate, slotTime);
    return `${formatInParis(iso, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} (heure de Paris)`;
  } catch {
    return `${slotDate} à ${slotTime}`;
  }
}

export function cancellationPolicyLabel(policy?: string): string {
  const opt = CANCELLATION_OPTIONS.find((o) => o.id === policy);
  return opt?.label ?? policy ?? "—";
}

export type BookingEmailData = {
  clientEmail: string;
  clientName?: string;
  clientPhone?: string;
  artistName?: string;
  studioAddress?: string;
  dateTimeParis?: string;
  style?: string;
  zone?: string;
  size?: string;
  budget?: string;
  projectSummary?: string;
  deposit?: number | string;
  depositPaid?: boolean;
  cancellationPolicy?: string;
  reference?: string;
};

function bookingRecapClientContent(data: BookingEmailData) {
  const paid = data.depositPaid !== false;
  const intro = paid
    ? "Ton acompte a bien été reçu. Voici le récapitulatif de ta réservation :"
    : "Ton rendez-vous est réservé. Voici le récapitulatif — pense à régler l'acompte avant le RDV :";

  const depositLabel =
    data.deposit != null && data.deposit !== ""
      ? paid
        ? `${data.deposit} € (payé)`
        : `${data.deposit} € (en attente)`
      : paid
        ? "Payé"
        : "En attente";

  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName ?? "")},</p>
    <p style="margin:0 0 16px;">${intro}</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Artiste", data.artistName ?? "")}
      ${row("Adresse", data.studioAddress ?? "")}
      ${row("Date & heure", data.dateTimeParis ?? "")}
      ${row("Style", data.style ?? "")}
      ${row("Zone", data.zone ?? "")}
      ${row("Taille", data.size ?? "")}
      ${row("Projet", data.projectSummary ?? "")}
      ${row("Acompte", depositLabel)}
      ${row("Annulation", cancellationPolicyLabel(data.cancellationPolicy))}
      ${data.reference ? row("Référence", data.reference) : ""}
    </div>
    <p style="margin:0;font-size:14px;color:#a1a1aa;">À très bientôt en studio !</p>`;

  return {
    subject: paid
      ? `Réservation confirmée — ${data.artistName ?? "Retvy"}`
      : `Rendez-vous réservé — ${data.artistName ?? "Retvy"}`,
    html: layout(paid ? "Réservation confirmée ✓" : "Rendez-vous réservé", inner),
    text: `Réservation chez ${data.artistName}. Réf. ${data.reference ?? ""}`,
  };
}

function bookingNotificationProContent(data: BookingEmailData) {
  const depositStatus =
    data.depositPaid === false
      ? `En attente${data.deposit != null && data.deposit !== "" ? ` (${data.deposit} €)` : ""}`
      : `Payé${data.deposit != null && data.deposit !== "" ? ` (${data.deposit} €)` : ""}`;

  const inner = `
    <p style="margin:0 0 16px;">Bonne nouvelle : un client vient de réserver un créneau sur ton agenda Retvy.</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Client", data.clientName ?? "")}
      ${row("Email", data.clientEmail)}
      ${row("Téléphone", data.clientPhone ?? "")}
      ${row("Date & heure", data.dateTimeParis ?? "")}
      ${row("Style", data.style ?? "")}
      ${row("Zone", data.zone ?? "")}
      ${row("Budget", data.budget ?? "")}
      ${row("Projet", data.projectSummary ?? "")}
      ${row("Acompte", depositStatus)}
      ${data.reference ? row("Référence", data.reference) : ""}
    </div>`;

  return {
    subject: `Nouvelle réservation — ${data.clientName ?? "client"}`,
    html: layout("Nouvelle réservation 🎉", inner),
    text: `Nouveau RDV : ${data.clientName} — ${data.dateTimeParis ?? ""}`,
  };
}

function bookingReminderClientContent(data: BookingEmailData & { daysUntil: number }) {
  const when =
    data.daysUntil === 1
      ? "demain"
      : `dans ${data.daysUntil} jours`;

  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName ?? "")},</p>
    <p style="margin:0 0 16px;">Petit rappel : ton rendez-vous tatouage chez <strong>${escapeHtml(data.artistName ?? "")}</strong> est prévu ${when}.</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Date & heure", data.dateTimeParis ?? "")}
      ${row("Adresse", data.studioAddress ?? "")}
      ${row("Artiste", data.artistName ?? "")}
      ${row("Projet", data.projectSummary ?? "")}
    </div>
    <p style="margin:0;font-size:14px;color:#a1a1aa;">À bientôt !</p>`;

  return {
    subject: `Rappel RDV ${when} — ${data.artistName ?? "Retvy"}`,
    html: layout("Rappel de rendez-vous", inner),
    text: `Rappel : RDV ${data.dateTimeParis} chez ${data.artistName}`,
  };
}

export async function sendBookingRecapClient(data: BookingEmailData) {
  const { subject, html, text } = bookingRecapClientContent(data);
  return sendBrevoEmail({
    to: [{ email: data.clientEmail, name: data.clientName }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: ["booking-recap-client"],
  });
}

export async function sendBookingNotificationPro(
  data: BookingEmailData & { proEmail: string },
) {
  const { subject, html, text } = bookingNotificationProContent(data);
  return sendBrevoEmail({
    to: [{ email: data.proEmail }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: ["booking-notification-pro"],
  });
}

export async function sendBookingReminderClient(
  data: BookingEmailData & { daysUntil: number },
) {
  const { subject, html, text } = bookingReminderClientContent(data);
  return sendBrevoEmail({
    to: [{ email: data.clientEmail, name: data.clientName }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: [`booking-reminder-j${data.daysUntil}`],
  });
}

function bookingCancellationProContent(data: BookingEmailData) {
  const inner = `
    <p style="margin:0 0 16px;">Un client a annulé un rendez-vous sur ton agenda Retvy.</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Client", data.clientName ?? "")}
      ${row("Date & heure", data.dateTimeParis ?? "")}
      ${row("Projet", data.projectSummary ?? "")}
    </div>
    <p style="margin:0;font-size:14px;color:#a1a1aa;">Le créneau est à nouveau disponible dans ton agenda.</p>`;
  return {
    subject: `RDV annulé — ${data.clientName ?? "client"}`,
    html: layout("Rendez-vous annulé", inner),
    text: `Annulation : ${data.clientName} — ${data.dateTimeParis ?? ""}`,
  };
}

export async function sendBookingCancellationPro(
  data: BookingEmailData & { proEmail: string },
) {
  const { subject, html, text } = bookingCancellationProContent(data);
  return sendBrevoEmail({
    to: [{ email: data.proEmail }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: ["booking-cancellation-pro"],
  });
}
