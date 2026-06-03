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

export type BookingEmailData = {
  clientEmail: string;
  clientName?: string;
  clientPhone?: string;
  artistName?: string;
  studioAddress?: string;
  date?: string;
  time?: string;
  projectSummary?: string;
  deposit?: number | string;
  reference?: string;
};

function bookingRecapClientContent(data: BookingEmailData) {
  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName ?? "")},</p>
    <p style="margin:0 0 16px;">Ton acompte a bien été reçu. Voici le récapitulatif de ta réservation :</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Artiste", data.artistName ?? "")}
      ${row("Adresse", data.studioAddress ?? "")}
      ${row("Date & heure", `${data.date ?? ""} à ${data.time ?? ""}`.trim())}
      ${row("Projet", data.projectSummary ?? "")}
      ${row("Acompte versé", data.deposit != null && data.deposit !== "" ? `${data.deposit} €` : "—")}
      ${data.reference ? row("Référence", data.reference) : ""}
    </div>
    <p style="margin:0;font-size:14px;color:#a1a1aa;">À très bientôt en studio !</p>`;
  return {
    subject: `Réservation confirmée — ${data.artistName ?? "Retvy"}`,
    html: layout("Réservation confirmée ✓", inner),
    text: `Réservation confirmée chez ${data.artistName}. Réf. ${data.reference ?? ""}`,
  };
}

function bookingNotificationProContent(data: BookingEmailData) {
  const inner = `
    <p style="margin:0 0 16px;">Bonne nouvelle : un client vient de réserver un créneau sur ton agenda Retvy.</p>
    <div style="background:#27272a;border:1px solid #3f3f46;border-radius:12px;padding:16px;margin:16px 0;">
      ${row("Client", data.clientName ?? "")}
      ${row("Email", data.clientEmail)}
      ${row("Téléphone", data.clientPhone ?? "")}
      ${row("Projet", data.projectSummary ?? "")}
      ${row("Date & heure", `${data.date ?? ""} à ${data.time ?? ""}`.trim())}
      ${row("Acompte reçu", data.deposit != null && data.deposit !== "" ? `${data.deposit} €` : "—")}
      ${data.reference ? row("Référence", data.reference) : ""}
    </div>`;
  return {
    subject: `Nouvelle réservation — ${data.clientName ?? "client"}`,
    html: layout("Nouvelle réservation 🎉", inner),
    text: `Nouveau RDV : ${data.clientName} le ${data.date} à ${data.time}`,
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
