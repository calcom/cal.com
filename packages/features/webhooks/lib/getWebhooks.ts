import { withReporting } from "@calcom/lib/sentryWrapper";
import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber } from "./dto/types";
import { WebhookOutputMapper } from "./infrastructure/mappers/WebhookOutputMapper";

export type GetSubscriberOptions = {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
};


const getWebhooks = async (
  options: GetSubscriberOptions,
  prisma: PrismaClient = defaultPrisma
): Promise<WebhookSubscriber[]> => {
  const teamId = options.teamId;
  const userId = options.userId ?? 0;
  const eventTypeId = options.eventTypeId ?? 0;
  const teamIds = Array.isArray(teamId) ? teamId : [teamId ?? 0];
  const orgId = options.orgId ?? 0;
  const oAuthClientId = options.oAuthClientId ?? "";

  const managedChildEventType = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
      parentId: {
        not: null,
      },
    },
    select: {
      parentId: true,
    },
  });

  const managedParentEventTypeId = managedChildEventType?.parentId ?? 0;

  // if we have userId and teamId it is a managed event type and should trigger for team and user
  const allWebhooks = await prisma.webhook.findMany({
    where: {
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
          eventTypeId: managedParentEventTypeId,
        },
        {
          teamId: {
            in: [...teamIds, orgId],
          },
        },
        { platformOAuthClientId: oAuthClientId },
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
      time: true,
      timeUnit: true,
      eventTriggers: true,
      version: true,
    },
  });

  return allWebhooks.map(WebhookOutputMapper.toSubscriberPartial);
};

export default withReporting(getWebhooks, "getWebhooks");
