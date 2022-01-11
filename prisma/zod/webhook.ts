import { Webhook, WebhookTriggerEvents } from "@prisma/client";
import * as z from "zod";

import { CompleteUser, UserModel } from "./index";

export const _WebhookModel = z.object({
  id: z.string(),
  userId: z.number().int(),
  subscriberUrl: z.string(),
  payloadTemplate: z.string().nullable(),
  createdAt: z.date(),
  active: z.boolean(),
  eventTriggers: z.nativeEnum(WebhookTriggerEvents).array(),
});

export interface CompleteWebhook extends Webhook {
  user: CompleteUser;
}

/**
 * WebhookModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const WebhookModel: z.ZodSchema<CompleteWebhook> = z.lazy(() =>
  _WebhookModel.extend({
    user: UserModel,
  })
);
