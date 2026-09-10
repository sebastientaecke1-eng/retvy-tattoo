import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBrevoEmail } from "@/lib/brevo";
import { getAppUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const appUrl = getAppUrl();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error || !data?.properties?.hashed_token) {
      console.error("[reset-password]", error?.message);
      // On renvoie OK même si l'email n'existe pas (sécurité anti-énumération)
      return NextResponse.json({ ok: true });
    }

    // Lien direct vers la page de changement de mot de passe
    // La page gère elle-même la vérification du token côté client
    const params = new URLSearchParams({
      token_hash: data.properties.hashed_token,
      type: "recovery",
    });
    const resetLink = `${appUrl}/auth/update-password?${params.toString()}`;

    await sendBrevoEmail({
      to: [{ email }],
      subject: "Réinitialisation de votre mot de passe Retvy",
      htmlContent: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Mot de passe oublié ?</h2>
          <p style="color:#555;margin-bottom:24px">
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            Ce lien est valable <strong>1 heure</strong>.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;
                    padding:12px 24px;border-radius:8px;text-decoration:none">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top:24px;font-size:12px;color:#999">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
        </div>
      `,
      textContent: `Réinitialisez votre mot de passe Retvy : ${resetLink}`,
      tags: ["password-reset"],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] unexpected", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
