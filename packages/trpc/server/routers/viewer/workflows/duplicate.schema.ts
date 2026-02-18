import { z } from "zod";

export const ZDuplicateWorkflowInputSchema = z.object({
  id: z.number(),
  targetTeamId: z.number().nullish(),
});

export type TDuplicateWorkflowInputSchema = z.infer<typeof ZDuplicateWorkflowInputSchema>;
