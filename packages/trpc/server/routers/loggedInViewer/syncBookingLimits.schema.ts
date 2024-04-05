import { z } from "zod";

export const ZSyncBookingLimitsInputSchema = z.object({
  eventIds: z.array(z.number()),
  isFuture: z.boolean().optional(),
});

export type TSyncBookingLimitsInputSchema = z.infer<typeof ZSyncBookingLimitsInputSchema>;
