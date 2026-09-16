/**
 * Rate limiter in-memory pour Cloudflare Workers.
 *
 * Chaque instance worker a son propre compteur (pas de mémoire partagée entre
 * instances). C'est une protection best-effort : efficace contre la grande
 * majorité des abus automatisés. Pour une protection absolue, combiner avec
 * les règles WAF Cloudflare (activées dans le dashboard).
 *
 * Usage :
 *   const ip = getClientIp(request);
 *   const result = checkRateLimit(`chat:${ip}`, { limit: 20, windowSecs: 60 });
 *   if (!result.ok) return rateLimitResponse(result);
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // timestamp ms
}

const store = new Map<string, RateLimitRecord>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now > record.resetAt) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Nombre max de requêtes dans la fenêtre */
  limit: number;
  /** Durée de la fenêtre en secondes */
  windowSecs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number; // timestamp ms
}

export function checkRateLimit(
  key: string,
  { limit, windowSecs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  // Nettoyage toutes les 60s
  if (now - lastCleanup > 60_000) {
    cleanup();
    lastCleanup = now;
  }

  const windowMs = windowSecs * 1_000;
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extrait l'IP réelle du client.
 * Cloudflare positionne CF-Connecting-IP sur toutes les requêtes.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

/**
 * Construit la réponse 429 standardisée avec les headers Retry-After.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSecs = Math.ceil((result.resetAt - Date.now()) / 1_000);
  return new Response(
    JSON.stringify({
      error: "Trop de requêtes. Réessayez dans quelques instants.",
      retryAfter: retryAfterSecs,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSecs),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
      },
    },
  );
}
