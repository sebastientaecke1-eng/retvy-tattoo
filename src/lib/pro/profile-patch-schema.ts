import { z } from "zod";
import { isProStyleId } from "@/lib/pro/styles";

const stylesArray = z
  .array(z.string())
  .min(1)
  .max(20)
  .refine((arr) => arr.every(isProStyleId), "Style invalide");

export const profilePatchSchema = z
  .object({
    artist_name: z.string().min(1).max(120).optional(),
    studio: z.string().max(120).nullable().optional(),
    city: z.string().min(1).max(120).optional(),
    address: z.string().max(240).nullable().optional(),
    postal_code: z
      .string()
      .regex(/^\d{5}$/, "Code postal invalide")
      .nullable()
      .optional(),
    phone: z.string().min(1).max(40).optional(),
    bio: z.string().max(4000).nullable().optional(),
    styles: stylesArray.optional(),
    price_min: z.number().int().min(0).max(50000).nullable().optional(),
    price_max: z.number().int().min(0).max(50000).nullable().optional(),
    avatar_url: z.string().url().max(2048).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.price_min == null || data.price_max == null) return true;
      return data.price_max >= data.price_min;
    },
    { message: "Le tarif max doit être ≥ au min." },
  );

export type ProfilePatchBody = z.infer<typeof profilePatchSchema>;
