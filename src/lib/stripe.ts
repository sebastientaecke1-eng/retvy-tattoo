import Stripe from "stripe";

/** Clé lue depuis process.env (secret Wrangler en prod, .env.local en dev). */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurée (wrangler secret put STRIPE_SECRET_KEY)",
    );
  }
  return new Stripe(key);
}
