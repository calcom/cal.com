import { z } from "zod";

export const ZGetHostsForAssignmentInputSchema = z.object({
  eventTypeId: z.number(),
  cursor: z.number().nullish(),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  memberUserIds: z.array(z.number()).max(1000).optional(),
});

export type TGetHostsForAssignmentInputSchema = z.infer<typeof ZGetHostsForAssignmentInputSchema>;
