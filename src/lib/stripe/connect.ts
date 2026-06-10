import type Stripe from "stripe";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

type AdminClient = ReturnType<typeof createAdminClient>;

type ProfileStripeRow = {
  stripe_account_id?: string | null;
  stripe_connect_account_id?: string | null;
};

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://retvy.fr";
}

export function resolveStripeAccountId(
  profile: ProfileStripeRow | null | undefined,
): string | null {
  return profile?.stripe_account_id ?? profile?.stripe_connect_account_id ?? null;
}

export type StripeConnectStatus = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  account_id: string | null;
};

export async function getStripeConnectStatus(
  accountId: string | null,
): Promise<StripeConnectStatus> {
  if (!accountId) {
    return {
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      account_id: null,
    };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  return {
    connected: Boolean(account.charges_enabled),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    account_id: accountId,
  };
}

export async function ensureStripeConnectAccount(
  admin: AdminClient,
  userId: string,
  email?: string | null,
): Promise<string> {
  const stripe = getStripe();

  const { data: profile, error: profileError } = await admin
    .from("pro_profiles")
    .select("user_id, stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Lecture profil pro échouée: ${profileError.message}`);
  }

  if (!profile?.user_id) {
    throw new Error("Profil pro introuvable — complétez votre inscription pro");
  }

  if (profile.stripe_account_id) return profile.stripe_account_id;

  const account = await stripe.accounts.create({
    type: "express",
    country: "FR",
    email: email ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { user_id: userId },
  });

  const { data: updated, error } = await admin
    .from("pro_profiles")
    .update({
      stripe_account_id: account.id,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("stripe_account_id")
    .single();

  if (error) {
    throw new Error(
      `Sauvegarde stripe_account_id échouée: ${error.message}`,
    );
  }

  if (!updated?.stripe_account_id) {
    throw new Error("stripe_account_id non enregistré en base");
  }

  return account.id;
}

export async function createStripeOnboardingLink(
  accountId: string,
  options?: { context?: "dashboard" | "onboarding" },
): Promise<string> {
  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const onboarding = options?.context === "onboarding";

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: onboarding
      ? `${baseUrl}/pro/inscription?connect=refresh`
      : `${baseUrl}/pro/dashboard?connect=refresh`,
    return_url: onboarding
      ? `${baseUrl}/pro/inscription?connect=done`
      : `${baseUrl}/pro/dashboard?connect=success`,
    type: "account_onboarding",
  });

  if (!accountLink.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL d'onboarding");
  }

  return accountLink.url;
}

export async function assertStripeAccountReady(
  stripe: Stripe,
  accountId: string,
): Promise<Stripe.Account> {
  const account = await stripe.accounts.retrieve(accountId);
  if (!account.charges_enabled) {
    throw new Error("Tatoueur non connecté à Stripe");
  }
  return account;
}
