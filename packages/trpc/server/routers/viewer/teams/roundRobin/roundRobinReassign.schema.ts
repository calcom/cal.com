import { z } from "zod";


export const ZRoundRobinReassignInputSchema = z.object({
  teamId: z.number(),
  bookingId: z.number(),
  reassignReason: z.string().optional(),
});

export type TRoundRobinReassignInputSchema = z.infer<typeof ZRoundRobinReassignInputSchema>;