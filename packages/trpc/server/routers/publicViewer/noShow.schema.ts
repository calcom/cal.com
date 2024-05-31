import { z } from "zod";

export const ZNoShowInputSchema = z.object({
  bookingUid: z.string(),
  attendeeEmails: z.array(z.string()).optional(),
});

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
