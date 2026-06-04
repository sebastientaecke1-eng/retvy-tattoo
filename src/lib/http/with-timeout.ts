/** Limite Workers ~30s/requête — 25s laisse une marge. */
export const EXTERNAL_REQUEST_TIMEOUT_MS = 25_000;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const signal =
    init?.signal ??
    AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...init, signal });
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS,
  label = "Requête externe",
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} : délai dépassé (${timeoutMs}ms)`)),
        timeoutMs,
      );
    }),
  ]);
}
