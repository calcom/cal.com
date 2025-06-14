import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string().trim().min(1, {
    message: "Schedule name cannot be empty",
  }),
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
