import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { WebhookSchema } from "@calcom/prisma/zod/modelSchema/WebhookSchema";

const schemaWebhookBaseBodyParams = WebhookSchema.pick({
  userId: true,
  eventTypeId: true,
  eventTriggers: true,
  active: true,
  subscriberUrl: true,
  payloadTemplate: true,
});

export const schemaWebhookCreateParams = z
  .object({
    // subscriberUrl: z.string().url(),
    // eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
    // active: z.boolean(),
    payloadTemplate: z.string().optional().nullable(),
    eventTypeId: z.number().optional(),
    userId: z.number().optional(),
    secret: z.string().optional().nullable(),
    // API shouldn't mess with Apps webhooks yet (ie. Zapier)
    // appId: z.string().optional().nullable(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookCreateParams);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams
  .merge(
    z.object({
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
      secret: z.string().optional().nullable(),
    })
  )
  .partial()
  .strict();
