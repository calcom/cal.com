import { z } from "zod";

export const ZGetRoundRobinHostsToReassignInputSchema = z.object({
  bookingId: z.number(),
  exclude: z.enum(["fixedHosts"]).optional(),
});

export type TGetRoundRobinHostsToReassignInputSchema = z.infer<
  typeof ZGetRoundRobinHostsToReassignInputSchema
>;
