import type { z } from "zod";
import { depositSettingsPutSchema } from "@/lib/pro/deposit-settings-schema";

export type DepositType = "fixed" | "percent";
export type CancellationPolicy = "24h" | "48h" | "72h" | "non_refundable";

export type DepositRule = {
  price_min: number;
  price_max: number | null;
  deposit_value: number;
};

export type DepositSettings = {
  deposit_type: DepositType;
  cancellation_policy: CancellationPolicy;
  rules: DepositRule[];
};

export const DEFAULT_FIXED_DEPOSIT_VALUES = [20, 40, 80, 120] as const;
export const DEFAULT_PERCENT_DEPOSIT_VALUES = [30, 40, 50, 60] as const;

export const DEFAULT_DEPOSIT_RULES: DepositRule[] = [
  { price_min: 0, price_max: 50, deposit_value: DEFAULT_FIXED_DEPOSIT_VALUES[0] },
  { price_min: 51, price_max: 150, deposit_value: DEFAULT_FIXED_DEPOSIT_VALUES[1] },
  { price_min: 151, price_max: 300, deposit_value: DEFAULT_FIXED_DEPOSIT_VALUES[2] },
  { price_min: 301, price_max: null, deposit_value: DEFAULT_FIXED_DEPOSIT_VALUES[3] },
];

/** Valeurs d'acompte par défaut selon le type (une par tranche, indexée). */
export function defaultDepositValueForTier(
  type: DepositType,
  tierIndex: number,
): number {
  const values =
    type === "percent"
      ? DEFAULT_PERCENT_DEPOSIT_VALUES
      : DEFAULT_FIXED_DEPOSIT_VALUES;
  return values[tierIndex] ?? values[values.length - 1];
}

export const DEFAULT_DEPOSIT_SETTINGS: DepositSettings = {
  deposit_type: "fixed",
  cancellation_policy: "48h",
  rules: DEFAULT_DEPOSIT_RULES,
};

export const CANCELLATION_OPTIONS: {
  id: CancellationPolicy;
  label: string;
}[] = [
  { id: "24h", label: "Remboursable si annulation 24h avant" },
  { id: "48h", label: "Remboursable si annulation 48h avant" },
  { id: "72h", label: "Remboursable si annulation 72h avant" },
  {
    id: "non_refundable",
    label: "Non remboursable dans tous les cas",
  },
];

export function formatRuleRange(rule: DepositRule): string {
  if (rule.price_max == null) {
    return `${rule.price_min}€+`;
  }
  return `${rule.price_min}–${rule.price_max}€`;
}

export function parseRulesFromDb(raw: unknown): DepositRule[] {
  const parsed = depositSettingsPutSchema.shape.rules.safeParse(raw);
  if (parsed.success && parsed.data.length > 0) return parsed.data;
  return DEFAULT_DEPOSIT_RULES;
}

export type DepositSettingsPutBody = z.infer<typeof depositSettingsPutSchema>;
