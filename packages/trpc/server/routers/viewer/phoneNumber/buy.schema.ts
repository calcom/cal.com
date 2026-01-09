import { z } from "zod";

export const ZBuyInputSchema = z.object({
  teamId: z.number().optional(),
  agentId: z.string(),
  workflowId: z.string(),
});

export type TBuyInputSchema = z.infer<typeof ZBuyInputSchema>;
