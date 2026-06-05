import { z } from "zod";

const depositRuleSchema = z.object({
  price_min: z.number().int().min(0).max(100000),
  price_max: z.number().int().min(0).max(100000).nullable(),
  deposit_value: z.number().min(0).max(100000),
});

export const depositSettingsPutSchema = z
  .object({
    deposit_type: z.enum(["fixed", "percent"]),
    cancellation_policy: z.enum(["24h", "48h", "72h", "non_refundable"]),
    rules: z.array(depositRuleSchema).min(1).max(20),
  })
  .superRefine((data, ctx) => {
    for (let i = 0; i < data.rules.length; i++) {
      const r = data.rules[i];
      if (r.price_max != null && r.price_max < r.price_min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tranche ${i + 1} : le max doit être ≥ au min.`,
          path: ["rules", i, "price_max"],
        });
      }
      if (data.deposit_type === "percent" && r.deposit_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le pourcentage ne peut pas dépasser 100 %.",
          path: ["rules", i, "deposit_value"],
        });
      }
    }
  });
