import { z } from "zod";

export const ZGetEventTypeAppsInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TGetEventTypeAppsInputSchema = z.infer<typeof ZGetEventTypeAppsInputSchema>;
