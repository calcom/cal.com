import type { PrismaClient } from "@prisma/client";

import defaultPrisma from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export type GetSubscriberOptions = {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | null;
};

const getWebhooks = async (options: GetSubscriberOptions, prisma: PrismaClient = defaultPrisma) => {
  const userId = options.teamId ? 0 : options.userId ?? 0;
  const eventTypeId = options.eventTypeId ?? 0;
  const teamId = options.teamId ?? 0;

  const allWebhooks = await prisma.webhook.findMany({
    where: {
      OR: [
        {
          userId,
        },
        {
          eventTypeId,
        },
        {
          teamId,
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
