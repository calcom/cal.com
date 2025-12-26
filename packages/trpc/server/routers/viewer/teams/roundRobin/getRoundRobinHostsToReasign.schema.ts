import { z } from "zod";

export const ZGetRoundRobinHostsInputSchema = z.object({
  bookingId: z.number(),
  exclude: z.literal("fixedHosts"),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  searchTerm: z.string().optional(),
});

export type TGetRoundRobinHostsToReassignInputSchema = z.input<typeof ZGetRoundRobinHostsInputSchema>;
