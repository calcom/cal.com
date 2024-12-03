import { z } from "zod";

// New schema for fetching hosts
export const ZGetRoundRobinHostsInputSchema = z.object({
  bookingId: z.number(),
  exclude: z.literal("fixedHosts"),
  cursor: z.number().optional(), // For pagination
  limit: z.number().min(1).max(100).optional(),
  searchTerm: z.string().optional(),
});

export type TGetRoundRobinHostsToReassignInputSchema = z.infer<typeof ZGetRoundRobinHostsInputSchema>;
