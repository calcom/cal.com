import { z } from "zod";

export const ZRoundRobinManualReassignInputSchema = z.object({
  bookingId: z.number(),
  teamMemberId: z.number(),
  reassignReason: z.string().optional(),
});

export type TRoundRobinManualReassignInputSchema = z.infer<typeof ZRoundRobinManualReassignInputSchema>;
