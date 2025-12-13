import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TRequestRescheduleInputSchema = {
  bookingUid: string;
  rescheduleReason?: string;
};

export const ZRequestRescheduleInputSchema: z.ZodType<TRequestRescheduleInputSchema> = z.object({
  bookingUid: z.string(),
  rescheduleReason: z.string().optional(),
});
