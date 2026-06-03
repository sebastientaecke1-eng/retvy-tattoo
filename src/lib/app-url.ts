const PRODUCTION_APP_URL = "https://retvy.fr";

/** URL publique de l'app (redirects auth). */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return PRODUCTION_APP_URL;
}
