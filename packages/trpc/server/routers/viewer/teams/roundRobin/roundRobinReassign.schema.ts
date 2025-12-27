import { z } from "zod";

export type TRoundRobinReassignInputSchema = {
  teamId: number;
  bookingId: number;
};

export const ZRoundRobinReassignInputSchema = z.object({
  teamId: z.number(),
  bookingId: z.number(),
});
