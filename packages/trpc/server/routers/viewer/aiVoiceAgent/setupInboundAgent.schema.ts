import { z } from "zod";

export const ZSetupInboundAgentInputSchema = z.object({
  phoneNumber: z.string(),
  teamId: z.number().optional(),
  workflowId: z.number(),
});

export type TSetupInboundAgentInputSchema = z.infer<typeof ZSetupInboundAgentInputSchema>;