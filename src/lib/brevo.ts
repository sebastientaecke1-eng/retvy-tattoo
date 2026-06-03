export type BrevoRecipient = { email: string; name?: string };

export type SendBrevoEmailParams = {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
};

export type SendBrevoEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

/** Envoi transactionnel via l'API REST Brevo (clé dans process.env.BREVO_API_KEY). */
export async function sendBrevoEmail(
  params: SendBrevoEmailParams,
): Promise<SendBrevoEmailResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "missing_api_key" };
  }

  if (!params.to.length) {
    return { ok: false, error: "no_recipients" };
  }

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL?.trim() ?? "contact@retvy.fr";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() ?? "Retvy";

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
        tags: params.tags,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("[brevo] send failed", res.status, body);
      return { ok: false, error: `http_${res.status}` };
    }

    try {
      const data = JSON.parse(body) as { messageId?: string };
      return { ok: true, messageId: data.messageId };
    } catch {
      return { ok: true };
    }
  } catch (err) {
    console.error("[brevo] network error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}
