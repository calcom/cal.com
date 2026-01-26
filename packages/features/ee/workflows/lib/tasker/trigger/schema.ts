import { z } from "zod";

export const workflowTaskSchema = z.object({
  bookingId: z.number(),
  smsReminderNumber: z.string().nullable(),
  hideBranding: z.boolean(),
  seatReferenceUid: z.string().optional(),
});
