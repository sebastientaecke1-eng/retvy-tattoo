import Stripe from "stripe";

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name]?.trim() || undefined;
}

/** Clé lue depuis process.env (secret Wrangler en prod, .env.local en dev). */
export function getStripeSecretKey(): string {
  const key = readEnv("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurée (wrangler secret put STRIPE_SECRET_KEY)",
    );
  }
  return key;
}

export function getStripe() {
  return new Stripe(getStripeSecretKey());
}
