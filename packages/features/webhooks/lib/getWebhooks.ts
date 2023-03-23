import { PrismaClient, WebhookTriggerEvents } from "@prisma/client";

import getGlobalSubscribers from "@calcom/lib/getGlobalSubscribers";
import defaultPrisma from "@calcom/prisma";

export type GetSubscriberOptions = {
  userId: number;
  eventTypeId: number;
  triggerEvent: WebhookTriggerEvents;
};

const getWebhooks = async (options: GetSubscriberOptions, prisma: PrismaClient = defaultPrisma) => {
  const { userId, eventTypeId } = options;
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      OR: [
        {
          userId,
        },
        {
          eventTypeId,
        },
      ],
      AND: {
        eventTriggers: {
          has: options.triggerEvent,
        },
        active: {
          equals: true,
        },
      },
    },
    select: {
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      appId: true,
      secret: true,
    },
  });

  getGlobalSubscribers(options.triggerEvent).forEach((subscriberUrl) => {
    allWebhooks.push({
      id: "global",
      subscriberUrl,
      payloadTemplate: null,
      appId: null,
      secret: process.env.GLOBAL_WEBHOOK_SECRET || null,
    });
  });

  return allWebhooks;
};

export default getWebhooks;
