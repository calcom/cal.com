import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string().min(1, { message: "Availability name is required" }),
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
  eventTypeId: z.number().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
