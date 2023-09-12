import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import { webhookIdAndEventTypeIdSchema } from "./types";

export const ZEditInputSchema = webhookIdAndEventTypeIdSchema.extend({
  id: z.string(),
  subscriberUrl: z.string().url().optional(),
  eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
  active: z.boolean().optional(),
  payloadTemplate: z.string().nullable(),
  eventTypeId: z.number().optional(),
  appId: z.string().optional().nullable(),
  secret: z.string().optional().nullable(),
});

export type TEditInputSchema = z.infer<typeof ZEditInputSchema>;
