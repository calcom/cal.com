import { z } from "zod";

export const ZGetChildrenForAssignmentInputSchema = z.object({
  eventTypeId: z.number(),
  cursor: z.number().nullish(),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type TGetChildrenForAssignmentInputSchema = z.infer<typeof ZGetChildrenForAssignmentInputSchema>;
