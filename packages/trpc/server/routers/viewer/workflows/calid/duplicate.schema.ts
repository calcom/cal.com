import { z } from "zod";

export const ZCalIdDuplicateInputSchema = z.object({
  workflowId: z.number(),
});

export type TCalIdDuplicateInputSchema = z.infer<typeof ZCalIdDuplicateInputSchema>;
