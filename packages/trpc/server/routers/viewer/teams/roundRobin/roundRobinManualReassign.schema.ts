import { z } from "zod";

export type TRoundRobinManualReassignInputSchema = {
  bookingId: number;
  teamMemberId: number;
  reassignReason?: string;
};

export const ZRoundRobinManualReassignInputSchema = z.object({
  bookingId: z.number(),
  teamMemberId: z.number(),
  reassignReason: z.string().optional(),
});
