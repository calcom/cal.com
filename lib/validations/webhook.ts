import { z } from "zod";

import { _WebhookModel as Webhook } from "@calcom/prisma/zod";

const schemaWebhookBaseBodyParams = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  eventTriggers: true,
  active: true,
  subscriberUrl: true,
  payloadTemplate: true,
}).partial();

export const schemaWebhookCreateParams = z
  .object({
    userId: z.number().or(z.string()).optional(),
    eventTypeId: z.number().or(z.string()).optional(),
    eventTriggers: z.any().optional(),
    active: z.boolean().optional(),
    subscriberUrl: z.string(),
    payloadTemplate: z.string().optional(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(
  schemaWebhookCreateParams
);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams.merge(
  z.object({
    payloadTemplate: z.string().optional(),
    /** @todo: don't use any here and validate eventTriggers proper */
    eventTriggers: z.any(),
    subscriberUrl: z.string().optional(),
  })
);

export const schemaWebhookReadPublic = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  payloadTemplate: true,
  eventTriggers: true,
  // eventType: true,
  // app: true,
  appId: true,
});
