import { z } from "zod";

export type TGetRoundRobinHostsToReassignInputSchema = {
  bookingId: number;
  exclude: "fixedHosts";
  cursor?: number;
  limit?: number;
  searchTerm?: string;
};

export const ZGetRoundRobinHostsInputSchema: z.ZodType<TGetRoundRobinHostsToReassignInputSchema> = z.object({
  bookingId: z.number(),
  exclude: z.literal("fixedHosts"),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  searchTerm: z.string().optional(),
});
