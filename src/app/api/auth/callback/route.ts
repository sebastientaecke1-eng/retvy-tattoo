import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { resolveSignupNextPath } from "@/lib/auth/signup-flow";
import { userHasProProfile } from "@/lib/auth/post-auth-path";
import { getAppUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function confirmUrl(origin: string, params: Record<string, string>): string {
  const url = new URL("/auth/confirm", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function resolveOrigin(request: Request): string {
  const appUrl = getAppUrl();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const hostOrigin = `${forwardedProto}://${forwardedHost}`;
    try {
      const appHost = new URL(appUrl).host;
      if (forwardedHost === appHost) return appUrl;
    } catch {
      /* ignore */
    }
    return hostOrigin;
  }
  try {
    const { host } = new URL(request.url);
    const appHost = new URL(appUrl).host;
    if (host === appHost) return appUrl;
  } catch {
    /* ignore */
  }
  return appUrl;
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
  const nextParam = requestUrl.searchParams.get("next");

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
  const typeParam = requestUrl.searchParams.get("type");
  const type =
    parseOtpType(typeParam) ??
    (tokenHash || token ? ("signup" as const) : null);

  if (!code && !tokenHash && !token) {
    return NextResponse.redirect(
      confirmUrl(origin, {
        error:
          "Lien incomplet. Ouvrez le lien depuis le dernier email de confirmation reçu.",
      }),
    );
  }

  const provisionalNext = resolveSignupNextPath(nextParam);
  const successRedirect = NextResponse.redirect(
    confirmUrl(origin, { next: provisionalNext }),
  );
  const supabase = await createRouteHandlerClient(successRedirect);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[api/auth/callback] exchangeCodeForSession", error);
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      console.error("[api/auth/callback] verifyOtp token_hash", error);
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
  } else if (token && type) {
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
      console.error("[api/auth/callback] verifyOtp token", error);
      return NextResponse.redirect(
        confirmUrl(origin, { error: humanizeAuthError(error.message) }),
      );
    }
  } else {
    return NextResponse.redirect(
      confirmUrl(origin, {
        error: "Type de confirmation manquant ou non reconnu.",
      }),
    );
  }

  // Pour un recovery, rediriger directement vers la page de changement de mot de passe
  if (typeParam === "recovery") {
    const recoveryDest = nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/auth/update-password";
    const recoveryRedirect = NextResponse.redirect(new URL(recoveryDest, origin).toString());
    // Copier les cookies de session depuis successRedirect
    const setCookieHeader = successRedirect.headers.get("set-cookie");
    if (setCookieHeader) {
      recoveryRedirect.headers.set("set-cookie", setCookieHeader);
    }
    return recoveryRedirect;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasProProfile = false;
  if (user) {
    const admin = createAdminClient();
    hasProProfile = await userHasProProfile(admin, user.id);
  }

  const resolvedNext = resolveSignupNextPath(
    nextParam,
    user?.user_metadata,
    hasProProfile,
  );

  if (resolvedNext !== provisionalNext) {
    return NextResponse.redirect(confirmUrl(origin, { next: resolvedNext }));
  }

  return successRedirect;
}
