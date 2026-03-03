import { z } from "zod";

export const zRecordJoinTimeSchema = z.object({
  bookingId: z.number(),
  attendeeId: z.number(),
});

export type TRecordJoinTimeSchema = z.infer<typeof zRecordJoinTimeSchema>;
