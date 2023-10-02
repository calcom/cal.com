import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export type GetSubscriberOptions = {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | null;
};

const getWebhooks = async (options: GetSubscriberOptions, prisma: PrismaClient = defaultPrisma) => {
  const loadOrganizer = async () => {
    const users = await prisma.user.findFirst({
      where: {
        email: process.env.HOST_EMAIL ? process.env.HOST_EMAIL : "",
      },
      select: {
        id: true,
      },
    });
    return users?.id;
  };

  const userId = await loadOrganizer();
  // const eventTypeId = options.eventTypeId ?? 0;
  // const teamId = options.teamId ?? 0;
  // if we have userId and teamId it is a managed event type and should trigger for team and user
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      OR: [
        {
          userId,
        },
        // {
        //   eventTypeId,
        // },
        // {
        //   teamId,
        // },
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
