import { z } from "zod";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZListInputSchema = webhookIdAndEventTypeIdSchema
  .extend({
    appId: z.string().optional(),
    teamId: z.number().optional(),
    eventTypeId: z.number().optional(),
  })
  .optional();

export type TListInputSchema = z.infer<typeof ZListInputSchema>;
