import { z } from "zod";

export const ZUpdateInboundAgentEventTypeInputSchema = z.object({
  agentId: z.string(),
  eventTypeId: z.number(),
  teamId: z.number().optional(),
});

export type TUpdateInboundAgentEventTypeInputSchema = z.infer<typeof ZUpdateInboundAgentEventTypeInputSchema>;
