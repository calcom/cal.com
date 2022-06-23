import { WebhookTriggerEvents, PrismaClient } from "@prisma/client";

export type GetSubscriberOptions = {
  userId: number;
  eventTypeId: number;
  triggerEvent: WebhookTriggerEvents;
};
/** @note will this not work with custom prisma? since we're importing prisma directly and not passing it from request here **/
const getWebhooks = async (options: GetSubscriberOptions, prisma: PrismaClient) => {
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
      subscriberUrl: true,
      payloadTemplate: true,
      appId: true,
    },
  });

  return allWebhooks;
};

export default getWebhooks;
