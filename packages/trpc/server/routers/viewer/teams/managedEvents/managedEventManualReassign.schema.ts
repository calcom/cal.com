import { z } from "zod";

export type TManagedEventManualReassignInputSchema = {
  bookingId: number;
  teamMemberId: number;
  reassignReason?: string;
};

export const ZManagedEventManualReassignInputSchema: z.ZodType<TManagedEventManualReassignInputSchema> =
  z.object({
    bookingId: z.number().int(),
    teamMemberId: z.number().int(),
    reassignReason: z.string().optional(),
  });
