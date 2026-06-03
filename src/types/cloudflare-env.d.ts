/** Secrets / vars injectés par Wrangler (runtime Worker). */
declare global {
  interface CloudflareEnv {
    BREVO_API_KEY?: string;
    BREVO_SENDER_EMAIL?: string;
    BREVO_SENDER_NAME?: string;
  }
}

export {};
