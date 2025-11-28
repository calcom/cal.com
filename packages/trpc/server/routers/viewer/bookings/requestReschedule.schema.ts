import { z } from "zod";

export const ZRequestRescheduleInputSchema = z.object({
  bookingUid: z.string(),
  rescheduleReason: z.string().optional(),
});

export type TRequestRescheduleInputSchema = z.infer<typeof ZRequestRescheduleInputSchema>;
