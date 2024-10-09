import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export type GetSubscriberOptions = {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
};

const getWebhooks = async (options: GetSubscriberOptions, prisma: PrismaClient = defaultPrisma) => {
  const teamId = options.teamId;
  const userId = options.userId ?? 0;
  const eventTypeId = options.eventTypeId ?? 0;
  const teamIds = Array.isArray(teamId) ? teamId : [teamId ?? 0];
  const orgId = options.orgId ?? 0;
  const oAuthClientId = options.oAuthClientId ?? "";

  // if we have userId and teamId it is a managed event type and should trigger for team and user
  const allWebhooks = await prisma.webhook.findMany({
    where: {
      active: true,
      OR: [
        {
          platform: true,
        },
        {
          userId,
        },
        {
          eventTypeId,
        },
        {
          teamId: {
            in: [...teamIds, orgId],
          },
        },
        { platformOAuthClientId: oAuthClientId },
      ],
    },
    select: {
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      appId: true,
      secret: true,
      time: true,
      timeUnit: true,
      eventTriggers: true,
    },
  });
  // because the query result array will for the most part be small at this point; we opt to filter in userland.
  return allWebhooks.filter((webhook) => webhook.eventTriggers.includes(options.triggerEvent));
};

export default getWebhooks;
