import type { Kysely } from "kysely";
import { sql } from "kysely";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { KyselyDatabase } from "@calcom/kysely/types";
import type { Webhook } from "@calcom/prisma/client";
import type { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

import type { WebhookSubscriber } from "../dto/types";
import type { IWebhookRepository } from "../interface/repository";
import type { GetSubscribersOptions } from "./types";

type WebhookGroup = {
  teamId?: number | null;
  profile: {
    slug: string | null;
    name: string | null;
    image?: string;
  };
  metadata?: {
    canModify: boolean;
    canDelete: boolean;
  };
  webhooks: Webhook[];
};

const filterWebhooks = (webhook: Webhook) => {
  const appIds = ["zapier", "make"];
  return !appIds.some((appId: string) => webhook.appId == appId);
};

export class KyselyWebhookRepository implements IWebhookRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]> {
    const teamId = options.teamId;
    const userId = options.userId;
    const eventTypeId = options.eventTypeId;
    const teamIds = Array.isArray(teamId) ? teamId : teamId ? [teamId] : undefined;
    const orgId = options.orgId;
    const oAuthClientId = options.oAuthClientId;

    let managedParentEventTypeId: number | undefined;
    if (eventTypeId) {
      const managedChildEventType = await this.dbRead
        .selectFrom("EventType")
        .select(["parentId"])
        .where("id", "=", eventTypeId)
        .where("parentId", "is not", null)
        .executeTakeFirst();
      managedParentEventTypeId = managedChildEventType?.parentId ?? undefined;
    }

    const webhooks = await this.getSubscribersRaw({
      userId,
      eventTypeId,
      managedParentEventTypeId,
      teamIds: teamIds && orgId ? [...teamIds, orgId] : teamIds || (orgId ? [orgId] : undefined),
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
      timeUnit: webhook.timeUnit as TimeUnit | null,
      eventTriggers: webhook.eventTriggers as WebhookTriggerEvents[],
    }));
  }

  private async getSubscribersRaw(params: {
    userId?: number | null;
    eventTypeId?: number | null;
    managedParentEventTypeId?: number | null;
    teamIds?: number[];
    oAuthClientId?: string | null;
    triggerEvent: WebhookTriggerEvents;
  }): Promise<WebhookSubscriber[]> {
    const { userId, eventTypeId, managedParentEventTypeId, teamIds, oAuthClientId, triggerEvent } = params;

    // Use raw SQL with UNION for better index utilization
    const results = await sql<{
      id: string;
      subscriberUrl: string;
      payloadTemplate: string | null;
      appId: string | null;
      secret: string | null;
      time: number | null;
      timeUnit: TimeUnit | null;
      eventTriggers: WebhookTriggerEvents[];
      priority: number;
    }>`
      -- Platform webhooks (highest priority)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        1 as priority
      FROM "Webhook"
      WHERE active = true 
        AND platform = true 
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
      
      UNION ALL
      
      -- User-specific webhooks (only if userId provided)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        2 as priority
      FROM "Webhook"
      WHERE active = true 
        AND ${userId} IS NOT NULL
        AND "userId" = ${userId}
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- Event type webhooks (only if eventTypeId provided)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        3 as priority
      FROM "Webhook"
      WHERE active = true 
        AND ${eventTypeId} IS NOT NULL
        AND "eventTypeId" = ${eventTypeId}
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- Parent event type webhooks (only if managedParentEventTypeId provided)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        4 as priority
      FROM "Webhook"
      WHERE active = true 
        AND ${managedParentEventTypeId} IS NOT NULL
        AND "eventTypeId" = ${managedParentEventTypeId}
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- Team webhooks (only if teamIds provided and not empty)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        5 as priority
      FROM "Webhook"
      WHERE active = true 
        AND ${teamIds ?? null} IS NOT NULL
        AND cardinality(${teamIds ?? []}::int[]) > 0
        AND "teamId" = ANY(${teamIds ?? []}::int[])
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      UNION ALL
      
      -- OAuth client webhooks (only if oAuthClientId provided)
      SELECT 
        id, "subscriberUrl", "payloadTemplate", "appId", secret, time, "timeUnit", "eventTriggers",
        6 as priority
      FROM "Webhook"
      WHERE active = true 
        AND ${oAuthClientId} IS NOT NULL
        AND "platformOAuthClientId" = ${oAuthClientId}
        AND ${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")
        AND platform = false
      
      ORDER BY priority, id
    `.execute(this.dbRead);

    const uniqueWebhooks = new Map<string, WebhookSubscriber>();
    for (const webhook of results.rows) {
      if (!uniqueWebhooks.has(webhook.id)) {
        const { priority: _priority, ...webhookData } = webhook;
        uniqueWebhooks.set(webhook.id, webhookData);
      }
    }

    return Array.from(uniqueWebhooks.values());
  }

  async getWebhookById(id: string): Promise<WebhookSubscriber | null> {
    const webhook = await this.dbRead
      .selectFrom("Webhook")
      .select([
        "id",
        "subscriberUrl",
        "payloadTemplate",
        "appId",
        "secret",
        "time",
        "timeUnit",
        "eventTriggers",
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!webhook) return null;

    return {
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      appId: webhook.appId,
      secret: webhook.secret,
      time: webhook.time,
      timeUnit: webhook.timeUnit as TimeUnit | null,
      eventTriggers: webhook.eventTriggers as WebhookTriggerEvents[],
    };
  }

  async findByWebhookId(webhookId?: string) {
    if (!webhookId) {
      throw new Error("Webhook ID is required");
    }

    const webhook = await this.dbRead
      .selectFrom("Webhook")
      .select([
        "id",
        "subscriberUrl",
        "payloadTemplate",
        "active",
        "eventTriggers",
        "secret",
        "teamId",
        "userId",
        "platform",
        "time",
        "timeUnit",
      ])
      .where("id", "=", webhookId)
      .executeTakeFirst();

    if (!webhook) {
      throw new Error("Webhook not found");
    }

    return {
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      active: webhook.active,
      eventTriggers: webhook.eventTriggers as WebhookTriggerEvents[],
      secret: webhook.secret,
      teamId: webhook.teamId,
      userId: webhook.userId,
      platform: webhook.platform,
      time: webhook.time,
      timeUnit: webhook.timeUnit,
    };
  }

  async findByOrgIdAndTrigger({
    orgId,
    triggerEvent,
  }: {
    orgId: number;
    triggerEvent: WebhookTriggerEvents;
  }): Promise<WebhookSubscriber[]> {
    const webhooks = await this.dbRead
      .selectFrom("Webhook")
      .select([
        "id",
        "subscriberUrl",
        "payloadTemplate",
        "active",
        "eventTriggers",
        "secret",
        "teamId",
        "userId",
        "platform",
        "time",
        "timeUnit",
        "appId",
      ])
      .where("teamId", "=", orgId)
      .where("platform", "=", false)
      .where(sql`${triggerEvent}::"WebhookTriggerEvents" = ANY("eventTriggers")`)
      .execute();

    return webhooks.map((webhook) => ({
      id: webhook.id,
      subscriberUrl: webhook.subscriberUrl,
      payloadTemplate: webhook.payloadTemplate,
      appId: webhook.appId,
      secret: webhook.secret,
      time: webhook.time,
      timeUnit: webhook.timeUnit as TimeUnit | null,
      eventTriggers: webhook.eventTriggers as WebhookTriggerEvents[],
    }));
  }

  async getFilteredWebhooksForUser({ userId, userRole }: { userId: number; userRole?: UserPermissionRole }) {
    const user = await this.dbRead
      .selectFrom("users")
      .select(["id", "username", "name", "avatarUrl"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's webhooks
    const userWebhooks = await this.dbRead
      .selectFrom("Webhook")
      .selectAll()
      .where("userId", "=", userId)
      .execute();

    // Get user's team memberships
    const memberships = await this.dbRead
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select([
        "Membership.role",
        "Team.id as teamId",
        "Team.name as teamName",
        "Team.slug as teamSlug",
        "Team.logoUrl as teamLogoUrl",
      ])
      .where("Membership.userId", "=", userId)
      .where("Membership.accepted", "=", true)
      .execute();

    // Get webhooks for each team
    const teamIds = memberships.map((m) => m.teamId);
    const teamWebhooks =
      teamIds.length > 0
        ? await this.dbRead.selectFrom("Webhook").selectAll().where("teamId", "in", teamIds).execute()
        : [];

    // Use permission service which handles both PBAC and role-based fallbacks
    const permissionService = new PermissionCheckService();

    // Build webhook groups with proper permissions
    const webhookGroups: WebhookGroup[] = [];

    // Add user's personal webhooks
    webhookGroups.push({
      teamId: null,
      profile: {
        slug: user.username,
        name: user.name,
        image: getUserAvatarUrl({ avatarUrl: user.avatarUrl }),
      },
      webhooks: (userWebhooks as Webhook[]).filter(filterWebhooks),
      metadata: {
        canModify: true,
        canDelete: true,
      },
    });

    // Check permissions for each team
    for (const membership of memberships) {
      const teamId = membership.teamId;

      // Check read permission (fallback: MEMBER, ADMIN, OWNER can read)
      const canRead = await permissionService.checkPermission({
        userId,
        teamId,
        permission: "webhook.read",
        fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      if (!canRead) {
        continue;
      }

      // Check update/delete permissions in parallel (fallback: only ADMIN, OWNER can modify)
      const [canUpdate, canDelete] = await Promise.all([
        permissionService.checkPermission({
          userId,
          teamId,
          permission: "webhook.update",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        }),
        permissionService.checkPermission({
          userId,
          teamId,
          permission: "webhook.delete",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        }),
      ]);

      const teamWebhooksFiltered = teamWebhooks.filter((w) => w.teamId === teamId);

      webhookGroups.push({
        teamId: membership.teamId,
        profile: {
          name: membership.teamName,
          slug: membership.teamSlug || null,
          image: getPlaceholderAvatar(membership.teamLogoUrl, membership.teamName),
        },
        webhooks: (teamWebhooksFiltered as Webhook[]).filter(filterWebhooks),
        metadata: {
          canModify: canUpdate,
          canDelete,
        },
      });
    }

    // Add platform webhooks for admins
    if (userRole === UserPermissionRole.ADMIN) {
      const platformWebhooks = await this.dbRead
        .selectFrom("Webhook")
        .selectAll()
        .where("platform", "=", true)
        .execute();

      webhookGroups.push({
        teamId: null,
        profile: {
          slug: "Platform",
          name: "Platform",
          image: getPlaceholderAvatar(null, "Platform"),
        },
        webhooks: platformWebhooks as Webhook[],
        metadata: {
          canDelete: true,
          canModify: true,
        },
      });
    }

    return {
      webhookGroups: webhookGroups.filter((group) => group.webhooks.length > 0),
      profiles: webhookGroups.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
    };
  }
}
