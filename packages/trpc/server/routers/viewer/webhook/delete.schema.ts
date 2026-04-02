import { z } from "zod";
import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZDeleteInputSchema = webhookIdAndEventTypeIdSchema.extend({
  id: z.string(),
  eventTypeId: z.number().optional(),
  teamId: z.number().optional(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
