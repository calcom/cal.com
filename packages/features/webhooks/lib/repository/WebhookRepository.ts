import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { WebhookSubscriber } from "../dto/types";

export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}

/**
 * Repository for fetching webhook subscribers from the database
 * Should only be called from the WebhookService
 */
export class WebhookRepository {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  /**
   * Fetches list of relevant subscribers from the database
   * Accepts query criteria and returns only minimal required fields for dispatching
   */
  async getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]> {
    const teamId = options.teamId;
    const userId = options.userId ?? 0;
    const eventTypeId = options.eventTypeId ?? 0;
    const teamIds = Array.isArray(teamId) ? teamId : [teamId ?? 0];
    const orgId = options.orgId ?? 0;
    const oAuthClientId = options.oAuthClientId ?? "";

    // Check for managed child event type
    const managedChildEventType = await this.prisma.eventType.findFirst({
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

    // Fetch webhooks with minimal required fields
    const webhooks = await this.prisma.webhook.findMany({
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
      },
    });

    // Map to our DTO format
    return webhooks.map((webhook) => ({
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      appId: webhook.appId,
      secret: webhook.secret,
      time: webhook.time,
      timeUnit: webhook.timeUnit as string | null,
      eventTriggers: webhook.eventTriggers,
    }));
  }

  /**
   * Gets a single webhook by ID (useful for scheduled webhooks)
   */
  async getWebhookById(id: string): Promise<WebhookSubscriber | null> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
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

    if (!webhook) return null;

    return {
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      appId: webhook.appId,
      secret: webhook.secret,
      time: webhook.time,
      timeUnit: webhook.timeUnit as string | null,
      eventTriggers: webhook.eventTriggers,
    };
  }
}

// Export with error reporting
export const webhookRepository = withReporting(
  (options: GetSubscribersOptions) => new WebhookRepository().getSubscribers(options),
  "WebhookRepository.getSubscribers"
);
