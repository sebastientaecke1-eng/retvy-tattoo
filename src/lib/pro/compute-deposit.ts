import type { DepositRule, DepositSettings } from "@/lib/pro/deposit-settings";
import { DEFAULT_DEPOSIT_SETTINGS } from "@/lib/pro/deposit-settings";

export function computeDepositFromSettings(
  priceMin: number,
  settings: Pick<DepositSettings, "deposit_type" | "rules"> = DEFAULT_DEPOSIT_SETTINGS,
): number {
  const ref = Math.max(0, Math.round(priceMin));
  const match = settings.rules.find(
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
  priceMin: number,
  rules: DepositRule[],
): DepositRule | null {
  const ref = Math.max(0, Math.round(priceMin));
  return (
    rules.find(
      (r) => ref >= r.price_min && (r.price_max == null || ref <= r.price_max),
    ) ?? null
  );
}
