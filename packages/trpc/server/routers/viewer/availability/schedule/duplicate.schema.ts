import { z } from "zod";

export const ZScheduleDuplicateSchema = z.object({
  scheduleId: z.number(),
  isManagedEventType: z.optional(z.boolean()),
});

export type TScheduleDuplicateSchema = z.infer<typeof ZScheduleDuplicateSchema>;
