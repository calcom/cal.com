import type { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber } from "../../dto/types";
import { WebhookVersion } from "../../interface/IWebhookRepository";

/**
 * Selected webhook fields from Prisma query
 * Uses explicit enum types from @calcom/prisma/enums to match query result
 */
type PrismaWebhookSelect = {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  appId: string | null;
  secret: string | null;
  eventTriggers: WebhookTriggerEvents[];
  time: number | null;
  timeUnit: TimeUnit | null;
  version: string;
};

export class WebhookOutputMapper {
  static toDomain(prismaWebhook: PrismaWebhookSelect): WebhookSubscriber {
    return {
      id: prismaWebhook.id,
      subscriberUrl: prismaWebhook.subscriberUrl,
      payloadTemplate: prismaWebhook.payloadTemplate,
      appId: prismaWebhook.appId,
      secret: prismaWebhook.secret,
      eventTriggers: prismaWebhook.eventTriggers,
      time: prismaWebhook.time ?? undefined,
      timeUnit: prismaWebhook.timeUnit ?? undefined,
      version: prismaWebhook.version as WebhookVersion,
    };
  }

  static toDomainList(prismaWebhooks: PrismaWebhookSelect[]): WebhookSubscriber[] {
    return prismaWebhooks.map(WebhookOutputMapper.toDomain);
  }

  static toSubscriberPartial(prismaWebhook: {
    id: string;
    subscriberUrl: string;
    eventTriggers: string[];
    version: string;
    payloadTemplate?: string | null;
    appId?: string | null;
    secret?: string | null;
    time?: number | null;
    timeUnit?: string | null;
  }): WebhookSubscriber {
    return {
      id: prismaWebhook.id,
      subscriberUrl: prismaWebhook.subscriberUrl,
      payloadTemplate: prismaWebhook.payloadTemplate ?? null,
      appId: prismaWebhook.appId ?? null,
      secret: prismaWebhook.secret ?? null,
      // Enums are just strings at runtime - Prisma validates them
      eventTriggers: prismaWebhook.eventTriggers as unknown as WebhookSubscriber["eventTriggers"],
      time: prismaWebhook.time ?? undefined,
      timeUnit: prismaWebhook.timeUnit as unknown as WebhookSubscriber["timeUnit"],
      version: prismaWebhook.version as WebhookVersion, // Type cast at boundary
    };
  }
}

