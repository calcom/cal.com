import z from "zod";

export const requestRescheduleSchema = z.object({
  bookingId: z.string(),
  rescheduleReason: z.string().optional(),
});
