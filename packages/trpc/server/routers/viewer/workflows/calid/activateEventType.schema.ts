import { z } from "zod";

export const ZCalIdActivateEventTypeInputSchema = z.object({
  eventTypeId: z.number(),
  workflowId: z.number(),
});

export type TCalIdActivateEventTypeInputSchema = z.infer<typeof ZCalIdActivateEventTypeInputSchema>;
