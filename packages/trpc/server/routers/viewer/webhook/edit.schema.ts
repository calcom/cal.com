import { TIME_UNIT } from "@calcom/features/ee/workflows/lib/constants";
import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import { z } from "zod";
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
  time: z.number().nullable().optional(),
  timeUnit: z.enum(TIME_UNIT).nullable().optional(),
  version: z.nativeEnum(WebhookVersion).optional(),
});

export type TEditInputSchema = z.infer<typeof ZEditInputSchema>;
