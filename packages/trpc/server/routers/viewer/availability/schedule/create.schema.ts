import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.date(),
          end: z.date(),
          targetTimeZones: z.array(z.string()).optional(),
        })
      )
    )
    .optional(),
  eventTypeId: z.number().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
