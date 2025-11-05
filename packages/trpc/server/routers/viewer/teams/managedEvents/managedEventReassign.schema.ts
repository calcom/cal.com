import { z } from "zod";

export const ZManagedEventReassignInputSchema = z.object({
  bookingId: z.number().int(),
});

export type TManagedEventReassignInputSchema = z.infer<typeof ZManagedEventReassignInputSchema>;

