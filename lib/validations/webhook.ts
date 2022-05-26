import { z } from "zod";

import { _WebhookModel as Webhook } from "@calcom/prisma/zod";
// import { WebhookTriggerEvents } from "@calcom/prisma/client";

// export const WEBHOOK_TRIGGER_EVENTS = [
//   WebhookTriggerEvents.BOOKING_CANCELLED,
//   WebhookTriggerEvents.BOOKING_CREATED,
//   WebhookTriggerEvents.BOOKING_RESCHEDULED,
// ] as ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"];

const schemaWebhookBaseBodyParams = Webhook.pick({
  userId: true,
  eventTypeId: true,
  eventTriggers: true,
  active: true,
  subscriberUrl: true,
  payloadTemplate: true,
}).partial();

export const schemaWebhookCreateParams = z
  .object({
    subscriberUrl: z.string().url(),
    eventTriggers: z.any(),
    active: z.boolean(),
    payloadTemplate: z.string().nullable(),
    eventTypeId: z.number().optional(),
    appId: z.string().optional().nullable(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(
  schemaWebhookCreateParams
);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams.merge(
  z.object({
    payloadTemplate: z.string().optional(),
    /** @todo: don't use 'any' here and validate eventTriggers proper */
    eventTriggers: z.any().optional(),
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
