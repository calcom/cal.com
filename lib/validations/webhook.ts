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

// const schemaWebhookCreateParams = z
//   .object({
//     id: z.string(),
//     subscriberUrl: z.string(),
//   })
//   .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(
  z.object({
    id: z.string(),
    subscriberUrl: z.string(),
  })
);

// const schemaWebhookEditParams = z
//   .object({
//     payloadTemplate: z.string().optional(),
//     /** @todo: don't use any here and validate eventTriggers proper */
//     eventTriggers: z.any(),
//     subscriberUrl: z.string().optional(),
//   })
//   .strict();

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
  /** @todo: find out why this breaks the api */
  // eventType: true,
  // app: true,
  appId: true,
});
