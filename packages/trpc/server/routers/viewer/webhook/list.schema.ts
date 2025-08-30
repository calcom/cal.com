import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZListInputSchema = webhookIdAndEventTypeIdSchema
  .extend({
    appId: z.string().optional(),
    teamId: z.number().optional(),
    eventTypeId: z.number().optional(),
    eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
  })
  .optional();

export type TListInputSchema = z.infer<typeof ZListInputSchema>;
