import { PrismaClient, WebhookTriggerEvents } from "@prisma/client";

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

  return allWebhooks;
};

export default getWebhooks;
