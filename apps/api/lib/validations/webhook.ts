import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import { _WebhookModel as Webhook } from "@calcom/prisma/zod";

const schemaWebhookBaseBodyParams = Webhook.pick({
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
    // API shouldn't mess with Apps webhooks yet (ie. Zapier)
    // appId: z.string().optional().nullable(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookCreateParams);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams
  .merge(
    z.object({
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
    })
  )
  .partial()
  .strict();

export const schemaWebhookReadPublic = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  payloadTemplate: true,
  eventTriggers: true,
  // FIXME: We have some invalid urls saved in the DB
  // subscriberUrl: true,
  /** @todo: find out how to properly add back and validate those. */
  // eventType: true,
  // app: true,
  appId: true,
}).merge(
  z.object({
    subscriberUrl: z.string(),
  })
);
