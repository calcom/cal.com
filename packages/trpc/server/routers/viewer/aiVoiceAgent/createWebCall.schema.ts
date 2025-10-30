import { z } from "zod";

export const ZCreateWebCallInputSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  teamId: z.number().optional(),
  eventTypeId: z.number().min(1, "Event Type ID is required"),
});

export type TCreateWebCallInputSchema = z.infer<typeof ZCreateWebCallInputSchema>;
