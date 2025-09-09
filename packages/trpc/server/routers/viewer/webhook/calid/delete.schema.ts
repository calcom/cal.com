import { z } from "zod";

import { calidWebhookIdAndEventTypeIdSchema } from "./types";

export const ZCalIdDeleteInputSchema = calidWebhookIdAndEventTypeIdSchema.extend({
  id: z.string(),
  eventTypeId: z.number().optional(),
  calIdTeamId: z.number().optional(),
});

export type TCalIdDeleteInputSchema = z.infer<typeof ZCalIdDeleteInputSchema>;
