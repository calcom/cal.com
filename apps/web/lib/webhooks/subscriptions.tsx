import { WebhookTriggerEvents } from "@prisma/client";

import prisma from "@lib/prisma";

const getSubscribers = async (userId: number, triggerEvent: WebhookTriggerEvents) => {
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      userId: userId,
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
