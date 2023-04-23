import { z } from "zod";

export const ZGetInputSchema = z.object({
  scheduleId: z.optional(z.number()),
  isManagedEventType: z.optional(z.boolean()),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
