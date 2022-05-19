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

const schemaWebhookCreateParams = z
  .object({
    id: z.string(),
    subscriberUrl: z.string(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookCreateParams);

const schemaWebhookEditParams = z
  .object({
    payloadTemplate: z.string().optional(),
    eventTriggers: z.string().optional(),
    subscriberUrl: z.date().optional(),
  })
  .strict();

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookEditParams);

export const schemaWebhookReadPublic = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  payloadTemplate: true,
  eventTriggers: true,
  eventType: true,
  app: true,
  appId: true,
});
