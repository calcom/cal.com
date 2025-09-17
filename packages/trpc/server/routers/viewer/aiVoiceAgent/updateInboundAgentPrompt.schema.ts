import { z } from "zod";

export const ZUpdateInboundAgentPromptInputSchema = z.object({
  agentId: z.string(),
  eventTypeId: z.number(),
});

export type TUpdateInboundAgentPromptInputSchema = z.infer<typeof ZUpdateInboundAgentPromptInputSchema>;