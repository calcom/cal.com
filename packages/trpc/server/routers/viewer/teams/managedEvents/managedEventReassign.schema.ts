import { z } from "zod";

export const ZManagedEventReassignInputSchema = z.object({
  bookingId: z.number(),
});

export type TManagedEventReassignInputSchema = z.infer<typeof ZManagedEventReassignInputSchema>;

