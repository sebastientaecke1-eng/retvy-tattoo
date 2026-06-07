import { z } from "zod";

export const inkBookBodySchema = z.object({
  style: z.string().min(1).max(60),
  zone: z.string().min(1).max(120),
  size: z.string().min(1).max(120),
  size_category: z.enum(["small", "medium", "large"]),
  budget: z.number().int().min(0).max(50000),
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().min(15).max(1440),
  client_name: z.string().min(2).max(200),
  client_email: z.string().email(),
  client_phone: z.string().min(6).max(40),
  project_description: z.string().min(1).max(2000),
  reference_image_url: z.string().url().max(2048).nullable().optional(),
  reference_note: z.string().max(500).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
});

export type InkBookBody = z.infer<typeof inkBookBodySchema>;
