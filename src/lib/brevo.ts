/**
 * Envoi d'emails via Brevo (ex-Sendinblue).
 * À brancher sur les flux auth / réservation.
 */
export async function sendBrevoEmail(payload: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY non configurée");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL ?? "contact@retvy.fr",
        name: process.env.BREVO_SENDER_NAME ?? "Retvy",
      },
      ...payload,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo: ${err}`);
  }
  return res.json();
}
