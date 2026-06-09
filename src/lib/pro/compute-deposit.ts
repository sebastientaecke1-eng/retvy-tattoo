import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseBudgetEuros } from "@/lib/pro/ink-booking";
import type { DepositRule, DepositSettings } from "@/lib/pro/deposit-settings";
import {
  DEFAULT_DEPOSIT_SETTINGS,
  parseRulesFromDb,
} from "@/lib/pro/deposit-settings";

function normalizeBudgetEur(value: number | string | unknown): number {
  const parsed = parseBudgetEuros(value);
  if (parsed != null) return parsed;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Acompte selon les tranches du pro — basé sur le budget client (pas l'estimation).
 * Tranche : price_min <= budget <= price_max (ou price_max null = sans plafond).
 */
export function computeDepositFromSettings(
  budgetEur: number | string | unknown,
  settings: Pick<DepositSettings, "deposit_type" | "rules"> = DEFAULT_DEPOSIT_SETTINGS,
): number {
  const ref = normalizeBudgetEur(budgetEur);
  const rules = [...settings.rules].sort((a, b) => a.price_min - b.price_min);
  const match = rules.find(
    (r) => ref >= r.price_min && (r.price_max == null || ref <= r.price_max),
  );
  if (!match) return 50;

  const value = Number(match.deposit_value) || 0;
  if (settings.deposit_type === "fixed") {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round((ref * value) / 100));
}

export function depositRuleForPrice(
  budgetEur: number | string | unknown,
  rules: DepositRule[],
): DepositRule | null {
  const ref = normalizeBudgetEur(budgetEur);
  return (
    [...rules]
      .sort((a, b) => a.price_min - b.price_min)
      .find(
        (r) => ref >= r.price_min && (r.price_max == null || ref <= r.price_max),
      ) ?? null
  );
}

/** Charge les réglages pro et calcule l'acompte à partir du budget client. */
export async function computeProDepositEur(
  admin: SupabaseClient<Database>,
  proUserId: string,
  budgetEur: number | string | unknown,
): Promise<number> {
  const { data: depositRow } = await admin
    .from("pro_deposit_settings")
    .select("deposit_type, rules")
    .eq("user_id", proUserId)
    .maybeSingle();

  const depositSettings = depositRow
    ? {
        deposit_type: depositRow.deposit_type,
        rules: parseRulesFromDb(depositRow.rules),
      }
    : undefined;

  return computeDepositFromSettings(budgetEur, depositSettings);
}
