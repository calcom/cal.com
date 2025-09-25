import { TIME_UNITS } from "@calid/features/modules/workflows/config/constants";
import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import { calidWebhookIdAndEventTypeIdSchema } from "./types";

export const ZCalIdEditInputSchema = calidWebhookIdAndEventTypeIdSchema.extend({
  id: z.string(),
  subscriberUrl: z.string().url().optional(),
  eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
  active: z.boolean().optional(),
  payloadTemplate: z.string().nullable(),
  eventTypeId: z.number().optional(),
  calIdTeamId: z.number().optional(),
  appId: z.string().optional().nullable(),
  secret: z.string().optional().nullable(),
  time: z.number().nullable().optional(),
  timeUnit: z.enum(TIME_UNITS).nullable().optional(),
});

export type TCalIdEditInputSchema = z.infer<typeof ZCalIdEditInputSchema>;
