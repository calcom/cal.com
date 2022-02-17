import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

const getSubscribers = async (userId: number, eventTypeId: number, triggerEvent: WebhookTriggerEvents) => {
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      OR: [
        {
          userId: userId,
        },
        {
          eventTypeId: eventTypeId,
        },
      ],
      AND: {
        eventTriggers: {
          has: triggerEvent,
        },
        active: {
          equals: true,
        },
      },
    },
    select: {
      subscriberUrl: true,
      payloadTemplate: true,
    },
  });

  return allWebhooks;
};

export default getSubscribers;
