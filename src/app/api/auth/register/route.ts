import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isAlreadyRegisteredAuthError,
} from "@/lib/auth/signup-flow";
import { getAppUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProRole } from "@/lib/supabase/ensure-pro-role";
import { sendBrevoEmail } from "@/lib/brevo";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  role: z.enum(["client", "pro"]),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  // Rate limit : 5 inscriptions / 15 min par IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`register:${ip}`, { limit: 5, windowSecs: 900 });
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const appUrl = getAppUrl();
    const emailRedirectTo = `${appUrl}/api/auth/callback`;

    const metadata: Record<string, string> = {
      first_name: body.firstName,
      last_name: body.lastName,
      role: body.role,
    };
    if (body.phone) metadata.phone = body.phone;

    const admin = createAdminClient();

    // Génère le lien de confirmation sans envoyer d'email via Supabase SMTP
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: body.email,
      password: body.password,
      options: {
        data: metadata,
        redirectTo: emailRedirectTo,
      },
    });

    if (linkError) {
      if (isAlreadyRegisteredAuthError(linkError.message)) {
        return NextResponse.json(
          {
            error: "Un compte existe déjà avec cet email. Connectez-vous.",
            code: "already_registered",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    if (body.role === "pro" && linkData.user?.id) {
      const roleResult = await ensureProRole(admin, linkData.user.id);
      if (!roleResult.ok) {
        console.error("[api/auth/register] ensureProRole", roleResult.message);
      }
    }

    // Envoie l'email de confirmation via Brevo API
    const confirmationUrl = linkData.properties?.action_link;
    if (confirmationUrl) {
      const emailResult = await sendBrevoEmail({
        to: [{ email: body.email, name: `${body.firstName} ${body.lastName}` }],
        subject: "Confirmez votre adresse email – Retvy",
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#111;margin-bottom:8px">Bonjour ${body.firstName} 👋</h2>
            <p style="color:#444;line-height:1.6">
              Merci de rejoindre Retvy ! Cliquez sur le bouton ci-dessous pour confirmer votre adresse email.
            </p>
            <a href="${confirmationUrl}"
               style="display:inline-block;margin-top:24px;padding:14px 28px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              Confirmer mon email
            </a>
            <p style="margin-top:32px;color:#888;font-size:13px">
              Si vous n'avez pas créé de compte, ignorez cet email.
            </p>
          </div>
        `,
        tags: ["email-confirmation"],
      });

      if (!emailResult.ok) {
        console.error("[api/auth/register] sendBrevoEmail failed", emailResult.error);
      }
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      sessionEstablished: false,
      redirectTo: body.role === "pro" ? "/pro/inscription" : "/client/dashboard",
      message: "",
    });
  } catch (err) {
    console.error("[api/auth/register] unexpected error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
