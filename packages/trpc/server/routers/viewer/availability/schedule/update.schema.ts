import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  scheduleId: z.number(),
  timeZone: z.string().optional(),
  name: z.string().optional(),
  isDefault: z.boolean().optional(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.coerce.date(),
          end: z.coerce.date(),
        })
      )
    )
    .optional(),
  dateOverrides: z
    .array(
      z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
      })
    )
    .optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
