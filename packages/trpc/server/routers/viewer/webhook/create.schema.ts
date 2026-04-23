import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

import { webhookIdAndEventTypeIdSchema } from "./types";

const TIME_UNIT = ["DAY", "HOUR", "MINUTE"] as const;

export const ZCreateInputSchema = webhookIdAndEventTypeIdSchema.extend({
  subscriberUrl: z.string().url(),
  eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
  active: z.boolean(),
  payloadTemplate: z.string().nullable(),
  eventTypeId: z.number().optional(),
  appId: z.string().optional().nullable(),
  secret: z.string().optional().nullable(),
  teamId: z.number().optional(),
  platform: z.boolean().optional(),
  time: z.number().nullable().optional(),
  timeUnit: z.enum(TIME_UNIT).nullable().optional(),
  version: z.nativeEnum(WebhookVersion).optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
