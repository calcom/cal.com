import { z } from "zod";

export const ZGetInputSchema = z.object({
  scheduleId: z.optional(z.number()),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
