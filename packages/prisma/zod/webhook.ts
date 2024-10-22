import * as z from "zod"
import * as imports from "../zod-utils"
import { WebhookTriggerEvents, TimeUnit } from "@prisma/client"
import { CompleteUser, UserModel, CompleteTeam, TeamModel, CompleteEventType, EventTypeModel, CompletePlatformOAuthClient, PlatformOAuthClientModel, CompleteApp, AppModel, CompleteWebhookScheduledTriggers, WebhookScheduledTriggersModel } from "./index"

export const _WebhookModel = z.object({
  id: z.string(),
  userId: z.number().int().nullish(),
  teamId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  platformOAuthClientId: z.string().nullish(),
  subscriberUrl: z.string().url(),
  payloadTemplate: z.string().nullish(),
  createdAt: z.date(),
  active: z.boolean(),
  eventTriggers: z.nativeEnum(WebhookTriggerEvents).array(),
  appId: z.string().nullish(),
  secret: z.string().nullish(),
  platform: z.boolean(),
  time: z.number().int().nullish(),
  timeUnit: z.nativeEnum(TimeUnit).nullish(),
})

export interface CompleteWebhook extends z.infer<typeof _WebhookModel> {
  user?: CompleteUser | null
  team?: CompleteTeam | null
  eventType?: CompleteEventType | null
  platformOAuthClient?: CompletePlatformOAuthClient | null
  app?: CompleteApp | null
  scheduledTriggers: CompleteWebhookScheduledTriggers[]
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
  platformOAuthClient: PlatformOAuthClientModel.nullish(),
  app: AppModel.nullish(),
  scheduledTriggers: WebhookScheduledTriggersModel.array(),
}))
