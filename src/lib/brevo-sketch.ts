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
};

export async function sendSketchValidationEmail(data: SketchEmailData) {
  const validateUrl = `${APP_URL}/api/sketch/${data.validationToken}/validate`;
  const revisionUrl = `${APP_URL}/api/sketch/${data.validationToken}/revision`;

  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(data.clientName)},</p>
    <p style="margin:0 0 16px;">
      ${escapeHtml(data.artistName)} a préparé un croquis pour ton projet
      (RDV du ${escapeHtml(data.bookingDate)}). Consulte-le et indique-nous
      si tu le valides ou si tu souhaites des modifications.
    </p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(data.sketchUrl)}" style="color:#f59e0b;">Voir le croquis</a>
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
      Valider : ${escapeHtml(validateUrl)}<br/>
      Modification : ${escapeHtml(revisionUrl)}
    </p>`;

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #3f3f46;border-radius:16px;">
    <tr><td style="padding:24px 32px;color:#d4d4d8;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 8px;font-size:13px;color:#f59e0b;font-weight:600;">Retvy</p>
      <h1 style="margin:0 0 16px;color:#fafafa;font-size:22px;">Ton croquis est prêt</h1>
      ${inner}
    </td></tr>
  </table>
</body>
</html>`;

  return sendBrevoEmail({
    to: [{ email: data.clientEmail, name: data.clientName }],
    subject: `Croquis à valider — ${data.artistName}`,
    htmlContent: html,
    textContent: `Croquis de ${data.artistName}. Valider : ${validateUrl} — Modification : ${revisionUrl}`,
    tags: ["sketch-validation"],
  });
}
