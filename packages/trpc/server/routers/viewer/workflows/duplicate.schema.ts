import { z } from "zod";

export const ZDuplicateInputSchema = z.object({
  workflowId: z.number(),
});

export type TDuplicateInputSchema = z.infer<typeof ZDuplicateInputSchema>;
