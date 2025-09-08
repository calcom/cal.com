import { z } from "zod";

export const ZActivateEventTypeInputSchema = z.object({
  eventTypeId: z.number(),
  workflowId: z.number(),
});

export type TActivateEventTypeInputSchema = z.infer<typeof ZActivateEventTypeInputSchema>;
