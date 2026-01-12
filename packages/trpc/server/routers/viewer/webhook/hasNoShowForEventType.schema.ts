import { z } from "zod";

export const ZHasNoShowForEventTypeInputSchema = z.object({
  eventTypeId: z.number(),
});

export type THasNoShowForEventTypeInputSchema = z.infer<typeof ZHasNoShowForEventTypeInputSchema>;
