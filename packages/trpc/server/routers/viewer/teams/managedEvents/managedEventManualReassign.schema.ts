import { z } from "zod";

export const ZManagedEventManualReassignInputSchema = z.object({
  bookingId: z.number(),
  teamMemberId: z.number(),
  reassignReason: z.string().optional(),
});

export type TManagedEventManualReassignInputSchema = z.infer<
  typeof ZManagedEventManualReassignInputSchema
>;

