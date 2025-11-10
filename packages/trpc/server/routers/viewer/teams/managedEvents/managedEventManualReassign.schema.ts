import { z } from "zod";

export const ZManagedEventManualReassignInputSchema = z.object({
  bookingId: z.number().int(),
  teamMemberId: z.number().int(),
  reassignReason: z.string().optional(),
});

export type TManagedEventManualReassignInputSchema = z.infer<
  typeof ZManagedEventManualReassignInputSchema
>;

