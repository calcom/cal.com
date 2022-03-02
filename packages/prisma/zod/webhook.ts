import * as z from "zod"
import * as imports from "../zod-utils"
import { WebhookTriggerEvents } from "@prisma/client"
import { CompleteUser, UserModel, CompleteEventType, EventTypeModel } from "./index"

export const _WebhookModel = z.object({
  id: z.string(),
  userId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  subscriberUrl: z.string(),
  payloadTemplate: z.string().nullish(),
  createdAt: z.date(),
  active: z.boolean(),
  eventTriggers: z.nativeEnum(WebhookTriggerEvents).array(),
})

export interface CompleteWebhook extends z.infer<typeof _WebhookModel> {
  user?: CompleteUser | null
  eventType?: CompleteEventType | null
}

/**
 * WebhookModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const WebhookModel: z.ZodSchema<CompleteWebhook> = z.lazy(() => _WebhookModel.extend({
  user: UserModel.nullish(),
  eventType: EventTypeModel.nullish(),
}))
