import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

async function deleteByUserId(
  table:
    | "pro_portfolio"
    | "pro_studio_photos"
    | "pro_schedules"
    | "pro_blocked_dates"
    | "pro_style_durations"
    | "pro_deposit_settings",
  userId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function cancelStripeSubscription(subscriptionId: string | null) {
  if (!subscriptionId?.trim()) return;

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status !== "canceled") {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (err) {
    console.error("[account/delete] stripe cancel", err);
  }
}

/** Supprime toutes les données applicatives puis l'utilisateur Auth. */
export async function deleteAccountForUser(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("pro_profiles")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  await cancelStripeSubscription(profile?.stripe_subscription_id ?? null);

  const proTables = [
    "pro_portfolio",
    "pro_studio_photos",
    "pro_schedules",
    "pro_blocked_dates",
    "pro_style_durations",
    "pro_deposit_settings",
  ] as const;

  for (const table of proTables) {
    await deleteByUserId(table, userId);
  }

  const { error: profileError } = await admin
    .from("pro_profiles")
    .delete()
    .eq("user_id", userId);
  if (profileError) {
    throw new Error(`pro_profiles: ${profileError.message}`);
  }

  const { error: rolesError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (rolesError) {
    throw new Error(`user_roles: ${rolesError.message}`);
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`auth: ${authError.message}`);
  }
}
