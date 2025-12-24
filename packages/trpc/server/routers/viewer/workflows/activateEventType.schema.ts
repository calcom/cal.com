import { z } from "zod";

export type TActivateEventTypeInputSchema = {
  eventTypeId: number;
  workflowId: number;
};

export const ZActivateEventTypeInputSchema: z.ZodType<TActivateEventTypeInputSchema> = z.object({
  eventTypeId: z.number(),
  workflowId: z.number(),
});
