import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";

const DEFAULT_NEXT = "/client/dashboard";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return next;
}

function confirmUrl(origin: string, params: Record<string, string>): string {
  const url = new URL("/auth/confirm", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function resolveOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return origin;
}

const OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function parseOtpType(type: string | null): EmailOtpType | null {
  if (!type || !OTP_TYPES.has(type)) return null;
  return type as EmailOtpType;
}

function humanizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("otp_expired")) {
    return "Ce lien de confirmation a expiré. Demandez un nouvel email de confirmation.";
  }
  if (lower.includes("invalid") || lower.includes("otp")) {
    return "Lien de confirmation invalide ou déjà utilisé.";
  }
  if (lower.includes("access_denied")) {
    return "Confirmation refusée. Réessayez depuis votre email.";
  }
  return message;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = resolveOrigin(request);
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  const oauthError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      confirmUrl(origin, {
        error: humanizeAuthError(oauthError),
      }),
    );
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const token = requestUrl.searchParams.get("token");
  const type = parseOtpType(requestUrl.searchParams.get("type"));

  if (!code && !tokenHash && !token) {
    return NextResponse.redirect(
      confirmUrl(origin, {
        error:
          "Lien incomplet. Ouvrez le lien depuis le dernier email de confirmation reçu.",
      }),
    );
  }

  const successRedirect = NextResponse.redirect(
    confirmUrl(origin, { next }),
  );
  const supabase = await createRouteHandlerClient(successRedirect);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
    return successRedirect;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
    return successRedirect;
  }

  if (token && type) {
    const email = requestUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.redirect(
        confirmUrl(origin, {
          error:
            "Lien incomplet (email manquant). Utilisez le lien reçu par email.",
        }),
      );
    }
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });
    if (error) {
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
    return successRedirect;
  }

  return NextResponse.redirect(
    confirmUrl(origin, {
      error: "Type de confirmation manquant ou non reconnu.",
    }),
  );
}
