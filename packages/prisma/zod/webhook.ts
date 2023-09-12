import * as z from "zod"
import * as imports from "../zod-utils"
import { WebhookTriggerEvents } from "@prisma/client"
import { CompleteUser, UserModel, CompleteTeam, TeamModel, CompleteEventType, EventTypeModel, CompleteApp, AppModel } from "./index"

export const _WebhookModel = z.object({
  id: z.string(),
  userId: z.number().int().nullish(),
  teamId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  subscriberUrl: z.string().url(),
  payloadTemplate: z.string().nullish(),
  createdAt: z.date(),
  active: z.boolean(),
  eventTriggers: z.nativeEnum(WebhookTriggerEvents).array(),
  appId: z.string().nullish(),
  secret: z.string().nullish(),
})

export interface CompleteWebhook extends z.infer<typeof _WebhookModel> {
  user?: CompleteUser | null
  team?: CompleteTeam | null
  eventType?: CompleteEventType | null
  app?: CompleteApp | null
}

/**
 * WebhookModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const WebhookModel: z.ZodSchema<CompleteWebhook> = z.lazy(() => _WebhookModel.extend({
  user: UserModel.nullish(),
  team: TeamModel.nullish(),
  eventType: EventTypeModel.nullish(),
  app: AppModel.nullish(),
}))
