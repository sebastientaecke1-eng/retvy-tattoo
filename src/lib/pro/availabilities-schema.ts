import { z } from "zod";

const timeSlotSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

const dayScheduleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  active: z.boolean(),
  slots: z.array(timeSlotSchema),
});

const styleDurationTierSchema = z
  .object({
    style: z.string().min(1).max(60),
    size_category: z.enum(["small", "medium", "large"]),
    duration_min_minutes: z.number().int().min(15).max(1440),
    duration_max_minutes: z.number().int().min(15).max(1440),
  })
  .refine((d) => d.duration_max_minutes >= d.duration_min_minutes, {
    message: "La durée max doit être ≥ à la durée min.",
  });

export const availabilitiesPutSchema = z.object({
  schedules: z.array(dayScheduleSchema),
  blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  style_durations: z.array(styleDurationTierSchema),
});

export type AvailabilitiesPutBody = z.infer<typeof availabilitiesPutSchema>;
