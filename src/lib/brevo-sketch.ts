import { sendBrevoEmail } from "./brevo";

const APP_URL = "https://retvy.fr";

function escapeHtml(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

export type SketchEmailData = {
  clientEmail: string;
  clientName: string;
  artistName: string;
  bookingDate: string;
  sketchUrl: string;
  validationToken: string;
  chatUrl?: string;
};

export type SketchChatNotifyClientData = {
  clientEmail: string;
  clientName: string;
  artistName: string;
  bookingDate: string;
  chatUrl: string;
};

export type SketchChatNotifyProData = {
  proEmail: string;
  clientName: string;
  artistName: string;
  bookingDate: string;
  chatUrl: string;
  kind: "message" | "approved" | "revision";
  preview?: string;
};

function sketchEmailLayout(title: string, inner: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #3f3f46;border-radius:16px;">
    <tr><td style="padding:24px 32px;color:#d4d4d8;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 8px;font-size:13px;color:#0057FF;font-weight:600;">Retvy</p>
      <h1 style="margin:0 0 16px;color:#fafafa;font-size:22px;">${escapeHtml(title)}</h1>
      ${inner}
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSketchValidationEmail(data: SketchEmailData) {
  const validateUrl = `${APP_URL}/api/sketch/${data.validationToken}/validate`;
  const revisionUrl = `${APP_URL}/api/sketch/${data.validationToken}/revision`;
  const chatUrl = data.chatUrl ?? `${APP_URL}/client/dashboard/croquis`;

  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName)},</p>
    <p style="margin:0 0 16px;">
      ${escapeHtml(data.artistName)} a préparé un croquis pour ton projet
      (RDV du ${escapeHtml(data.bookingDate)}). Consulte-le et indique-nous
      si tu le valides ou si tu souhaites des modifications.
    </p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(data.sketchUrl)}" style="color:#0057FF;">Voir le croquis</a>
    </p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(chatUrl)}" style="display:inline-block;background:#0057FF;color:#fff;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;">
        Ouvrir le tchat croquis
      </a>
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="padding-right:12px;">
          <a href="${escapeHtml(validateUrl)}" style="display:inline-block;background:#22c55e;color:#fff;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;">
            Valider
          </a>
        </td>
        <td>
          <a href="${escapeHtml(revisionUrl)}" style="display:inline-block;background:#27272a;color:#fafafa;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;border:1px solid #52525b;">
            Demander une modification
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      Si les boutons ne s'affichent pas, copie ces liens :<br/>
      Tchat : ${escapeHtml(chatUrl)}<br/>
      Valider : ${escapeHtml(validateUrl)}<br/>
      Modification : ${escapeHtml(revisionUrl)}
    </p>`;

  return sendBrevoEmail({
    to: [{ email: data.clientEmail, name: data.clientName }],
    subject: `Croquis à valider — ${data.artistName}`,
    htmlContent: sketchEmailLayout("Ton croquis est prêt", inner),
    textContent: `Croquis de ${data.artistName}. Tchat : ${chatUrl} — Valider : ${validateUrl}`,
    tags: ["sketch-validation"],
  });
}

export async function sendSketchChatNotifyClient(data: SketchChatNotifyClientData) {
  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName)},</p>
    <p style="margin:0 0 16px;">
      ${escapeHtml(data.artistName)} t'a envoyé un nouveau message ou croquis
      pour ton RDV du ${escapeHtml(data.bookingDate)}.
    </p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(data.chatUrl)}" style="display:inline-block;background:#0057FF;color:#fff;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;">
        Voir le tchat croquis
      </a>
    </p>`;

  return sendBrevoEmail({
    to: [{ email: data.clientEmail, name: data.clientName }],
    subject: `Nouveau croquis — ${data.artistName}`,
    htmlContent: sketchEmailLayout("Nouveau message croquis", inner),
    textContent: `Nouveau croquis de ${data.artistName}. Tchat : ${data.chatUrl}`,
    tags: ["sketch-chat-client"],
  });
}

export async function sendSketchChatNotifyPro(data: SketchChatNotifyProData) {
  const titles = {
    message: "Nouveau message client",
    approved: "Croquis validé ✅",
    revision: "Modification demandée",
  };
  const bodies = {
    message: `${escapeHtml(data.clientName)} t'a envoyé un message sur le tchat croquis (RDV du ${escapeHtml(data.bookingDate)}).`,
    approved: `${escapeHtml(data.clientName)} a validé le croquis pour le RDV du ${escapeHtml(data.bookingDate)}.`,
    revision: `${escapeHtml(data.clientName)} demande une modification sur le croquis (RDV du ${escapeHtml(data.bookingDate)}).`,
  };

  const preview = data.preview?.trim()
    ? `<p style="margin:16px 0;padding:12px;background:#27272a;border-radius:8px;color:#e4e4e7;font-style:italic;">« ${escapeHtml(data.preview)} »</p>`
    : "";

  const inner = `
    <p style="margin:0 0 16px;">${bodies[data.kind]}</p>
    ${preview}
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(data.chatUrl)}" style="display:inline-block;background:#0057FF;color:#fff;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;">
        Ouvrir le tchat croquis
      </a>
    </p>`;

  return sendBrevoEmail({
    to: [{ email: data.proEmail }],
    subject: `${titles[data.kind]} — ${data.clientName}`,
    htmlContent: sketchEmailLayout(titles[data.kind], inner),
    textContent: `${titles[data.kind]} — ${data.chatUrl}`,
    tags: [`sketch-chat-pro-${data.kind}`],
  });
}
