import { z } from "zod";

export const ZGetHostsForAssignmentInputSchema = z.object({
  eventTypeId: z.number(),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type TGetHostsForAssignmentInputSchema = z.infer<typeof ZGetHostsForAssignmentInputSchema>;
