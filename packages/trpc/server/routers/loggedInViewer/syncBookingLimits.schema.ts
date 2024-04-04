import { z } from "zod";

export const ZSyncBookingLimitsInputSchema = z.object({
  eventIds: z.array(z.number()),
});

export type TSyncBookingLimitsInputSchema = z.infer<typeof ZSyncBookingLimitsInputSchema>;
