import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

export const ZUpdateInputSchema = z.object({
  scheduleId: z.number(),
  timeZone: timeZoneSchema.optional(),
  name: z.string().optional(),
  isDefault: z.boolean().optional(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.date(),
          end: z.date(),
        })
      )
    )
    .optional(),
  dateOverrides: z
    .array(
      z.object({
        start: z.date(),
        end: z.date(),
      })
    )
    .optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
