import { withReporting } from "@calcom/lib/sentryWrapper";
import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber } from "../dto/types";
import type { GetSubscribersOptions } from "./types";

/**
 * Repository for fetching webhook subscribers and configurations from the database.
 *
 * @description This repository provides data access methods for webhook-related database operations,
 * abstracting the underlying database queries and providing a clean interface for webhook data retrieval.
 * It follows the repository pattern to separate data access logic from business logic.
 *
 * @responsibilities
 * - Fetches webhook subscribers based on trigger events and organizational context
 * - Retrieves webhook configurations and subscription details from the database
 * - Provides filtered queries for active webhooks and specific event types
 * - Abstracts database schema details from the service layer
 *
 * @example Fetching webhooks for a booking event
 * ```typescript
 * const repository = new WebhookRepository();
 * const webhooks = await repository.findWebhooksByTrigger({
 *   triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
 *   teamId: 123
 * });
 * // Returns array of webhook subscribers for the event
 * ```
 *
 * @access Should only be called from WebhookService to maintain proper layering
 * @see WebhookService For business logic that uses this repository
 */
export class WebhookRepository {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  async getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]> {
    const teamId = options.teamId;
    const userId = options.userId ?? 0;
    const eventTypeId = options.eventTypeId ?? 0;
    const teamIds = Array.isArray(teamId) ? teamId : [teamId ?? 0];
    const orgId = options.orgId ?? 0;
    const oAuthClientId = options.oAuthClientId ?? "";

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

    const webhooks = await this.getSubscribersRaw({
      userId,
      eventTypeId,
      managedParentEventTypeId,
      teamIds: [...teamIds, orgId],
      oAuthClientId,
      triggerEvent: options.triggerEvent,
    });

    return webhooks.map((webhook) => ({
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      appId: webhook.appId,
      secret: webhook.secret,
      time: webhook.time,
      timeUnit: webhook.timeUnit as string | null,
      eventTriggers: webhook.eventTriggers as any[],
    }));
  }

  /**
   * Raw SQL query using UNION for better index utilization than complex ORs
   * Each UNION branch can use its own optimal index
   */
  private async getSubscribersRaw(params: {
    userId: number;
    eventTypeId: number;
    managedParentEventTypeId: number;
    teamIds: number[];
    oAuthClientId: string;
    triggerEvent: WebhookTriggerEvents;
  }): Promise<any[]> {
    const { userId, eventTypeId, managedParentEventTypeId, teamIds, oAuthClientId, triggerEvent } = params;

    const teamIdParams = teamIds.map((_, index) => `$${6 + index}`).join(",");

    const query = `
      -- Platform webhooks (highest priority)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        1 as priority
      FROM "Webhook"
      WHERE active = true 
        AND platform = true 
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
      
      UNION ALL
      
      -- User-specific webhooks
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        2 as priority
      FROM "Webhook"
      WHERE active = true 
        AND "userId" = $2 
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- Event type webhooks
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        3 as priority
      FROM "Webhook"
      WHERE active = true 
        AND "eventTypeId" = $3 
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- Parent event type webhooks (for managed events)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        4 as priority
      FROM "Webhook"
      WHERE active = true 
        AND "eventTypeId" = $4 
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
        AND $4 > 0
      
      UNION ALL
      
      -- Team webhooks
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        5 as priority
      FROM "Webhook"
      WHERE active = true 
        AND "teamId" IN (${teamIdParams})
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- OAuth client webhooks
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        6 as priority
      FROM "Webhook"
      WHERE active = true 
        AND "platformOAuthClientId" = $5 
        AND $1::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
        AND $5 != ''
      
      ORDER BY priority, id;
    `;

    const queryParams = [
      triggerEvent,
      userId,
      eventTypeId,
      managedParentEventTypeId,
      oAuthClientId,
      ...teamIds,
    ];

    const results = await this.prisma.$queryRawUnsafe(query, ...queryParams);

    const uniqueWebhooks = new Map();
    for (const webhook of results as any[]) {
      if (!uniqueWebhooks.has(webhook.id)) {
        const { priority, ...webhookData } = webhook;
        uniqueWebhooks.set(webhook.id, webhookData);
      }
    }

    return Array.from(uniqueWebhooks.values());
  }

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

export const webhookRepository = withReporting(
  (options: GetSubscribersOptions) => new WebhookRepository().getSubscribers(options),
  "WebhookRepository.getSubscribers"
);
