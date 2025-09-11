import { TIME_UNITS } from "@calid/features/modules/workflows/config/constants";
import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

import { calidWebhookIdAndEventTypeIdSchema } from "./types";

export const ZCalIdCreateInputSchema = calidWebhookIdAndEventTypeIdSchema.extend({
  subscriberUrl: z.string().url(),
  eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
  active: z.boolean(),
  payloadTemplate: z.string().nullable(),
  eventTypeId: z.number().optional(),
  appId: z.string().optional().nullable(),
  secret: z.string().optional().nullable(),
  calIdTeamId: z.number().optional(),
  time: z.number().nullable().optional(),
  timeUnit: z.enum(TIME_UNITS).nullable().optional(),
});

export type TCalIdCreateInputSchema = z.infer<typeof ZCalIdCreateInputSchema>;
