import { z } from "zod";

export const ZGetManagedEventUsersToReassignInputSchema = z.object({
  bookingId: z.number(),
  cursor: z.number().optional(), // For pagination
  limit: z.number().min(1).max(100).optional(),
  searchTerm: z.string().optional(),
});

export type TGetManagedEventUsersToReassignInputSchema = z.infer<
  typeof ZGetManagedEventUsersToReassignInputSchema
>;

