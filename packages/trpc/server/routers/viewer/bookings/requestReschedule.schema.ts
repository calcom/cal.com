import { z } from "zod";

export type TRequestRescheduleInputSchema = {
  bookingUid: string;
  rescheduleReason?: string;
};

export const ZRequestRescheduleInputSchema: z.ZodType<TRequestRescheduleInputSchema> = z.object({
  bookingUid: z.string(),
  rescheduleReason: z.string().optional(),
});
