import { z } from "zod";

export const ZGetAllChildrenForAssignmentInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TGetAllChildrenForAssignmentInputSchema = z.infer<typeof ZGetAllChildrenForAssignmentInputSchema>;
