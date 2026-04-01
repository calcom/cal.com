import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { getWebhookFeature, webhookContainer } from "@calcom/features/di/webhooks/containers/webhook";
import { WEBHOOK_TOKENS } from "@calcom/features/di/webhooks/Webhooks.tokens";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Webhook } from "@calcom/prisma/client";
import {
  CreationSource,
  MembershipRole,
  UserPermissionRole,
  WebhookTriggerEvents,
} from "@calcom/prisma/enums";
import { v4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests for WebhookRepository.getSubscribers
 *
 * Validates the conditional UNION query builder against a real PostgreSQL instance.
 * Optional UNION branches are only included when their params are truthy,
 * preventing 42P18 ("could not determine data type of parameter").
 *
 * Uses the DI container for the webhook repository (same wiring as production)
 * and repository create methods for test data where available.
 */
describe("WebhookRepository.getSubscribers (integration)", () => {
  const testId = v4();
  let repository: IWebhookRepository;
  let userRepository: UserRepository;
  let teamRepository: TeamRepository;
  let eventTypeRepository: EventTypeRepository;

  let testUserId: number;
  let testTeamId: number;
  let testEventTypeId: number;
  let userWebhook: Webhook;
  let eventTypeWebhook: Webhook;
  let teamWebhook: Webhook;

  beforeAll(async () => {
    repository = getWebhookFeature().repository;

    const prismaClient = webhookContainer.get<PrismaClient>(DI_TOKENS.PRISMA_CLIENT);
    userRepository = new UserRepository(prismaClient);
    teamRepository = getTeamRepository(prismaClient);
    eventTypeRepository = webhookContainer.get<EventTypeRepository>(
      WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY
    );

    const testUser = await userRepository.create({
      email: `wh-repo-int-${testId}@example.com`,
      username: `wh-repo-int-${testId}`,
      name: "Webhook Repo Integration Test User",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    testUserId = testUser.id;

    // TeamRepository has no create method — fall back to prisma
    const testTeam = await prisma.team.create({
      data: {
        name: `wh-repo-int-team-${testId}`,
        slug: `wh-repo-int-team-${testId}`,
      },
    });
    testTeamId = testTeam.id;

    const testEventType = await eventTypeRepository.create({
      title: "Webhook Repo Integration Test Event",
      slug: `wh-repo-int-event-${testId}`,
      length: 30,
      userId: testUserId,
    });
    testEventTypeId = testEventType.id;

    // WebhookRepository has no create method — fall back to prisma
    userWebhook = await prisma.webhook.create({
      data: {
        id: `wh-repo-int-user-${testId}`,
        userId: testUserId,
        subscriberUrl: `https://example.com/user-webhook-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      },
    });

    eventTypeWebhook = await prisma.webhook.create({
      data: {
        id: `wh-repo-int-evt-${testId}`,
        eventTypeId: testEventTypeId,
        subscriberUrl: `https://example.com/eventtype-webhook-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      },
    });

    teamWebhook = await prisma.webhook.create({
      data: {
        id: `wh-repo-int-team-${testId}`,
        teamId: testTeamId,
        subscriberUrl: `https://example.com/team-webhook-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      },
    });
  });

  afterAll(async () => {
    // No repository delete methods for webhooks, event types, or users — use prisma
    await prisma.webhook.deleteMany({
      where: { id: { in: [userWebhook.id, eventTypeWebhook.id, teamWebhook.id] } },
    });
    await prisma.eventType.deleteMany({ where: { id: testEventTypeId } });
    await teamRepository.deleteById({ id: testTeamId });
    // UserRepository.create also creates schedules — clean those up first
    await prisma.availability.deleteMany({
      where: { Schedule: { userId: testUserId } },
    });
    await prisma.schedule.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  it("should execute with only the platform branch when all optional params are omitted", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
    });

    expect(Array.isArray(result)).toBe(true);
    const ids = result.map((w) => w.id);
    expect(ids).not.toContain(userWebhook.id);
    expect(ids).not.toContain(eventTypeWebhook.id);
    expect(ids).not.toContain(teamWebhook.id);
  });

  it("should return user-scoped webhooks when userId is provided", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      userId: testUserId,
    });

    const ids = result.map((w) => w.id);
    expect(ids).toContain(userWebhook.id);
  });

  it("should return event-type-scoped webhooks when eventTypeId is provided", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      eventTypeId: testEventTypeId,
    });

    const ids = result.map((w) => w.id);
    expect(ids).toContain(eventTypeWebhook.id);
  });

  it("should return team-scoped webhooks when teamId is provided", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      teamId: testTeamId,
    });

    const ids = result.map((w) => w.id);
    expect(ids).toContain(teamWebhook.id);
  });

  it("should not return webhooks for a non-matching trigger event", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      userId: testUserId,
      eventTypeId: testEventTypeId,
      teamId: testTeamId,
    });

    const ids = result.map((w) => w.id);
    expect(ids).not.toContain(userWebhook.id);
    expect(ids).not.toContain(eventTypeWebhook.id);
    expect(ids).not.toContain(teamWebhook.id);
  });

  it("should combine user, event type, and team webhooks in a single call", async () => {
    const result = await repository.getSubscribers({
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      userId: testUserId,
      eventTypeId: testEventTypeId,
      teamId: testTeamId,
    });

    const ids = result.map((w) => w.id);
    expect(ids).toContain(userWebhook.id);
    expect(ids).toContain(eventTypeWebhook.id);
    expect(ids).toContain(teamWebhook.id);
  });
});

/**
 * Extended integration tests for WebhookRepository
 * Covers getSubscribers (additional scenarios), getWebhookById, findByWebhookId,
 * findByOrgIdAndTrigger, getFilteredWebhooksForUser, and listWebhooks.
 */
describe("WebhookRepository extended (integration)", () => {
  const testId = v4();
  let repository: IWebhookRepository;
  let userRepository: UserRepository;
  let eventTypeRepository: EventTypeRepository;

  // Test entities
  let userId: number;
  let teamId: number;
  let team2Id: number;
  let orgId: number;
  let eventTypeId: number;
  let managedParentETId: number;
  let managedChildETId: number;
  let oauthClientId: string;

  // Webhooks tracked for cleanup
  const webhookIds: string[] = [];

  beforeAll(async () => {
    repository = getWebhookFeature().repository;
    const prismaClient = webhookContainer.get<PrismaClient>(DI_TOKENS.PRISMA_CLIENT);
    userRepository = new UserRepository(prismaClient);
    eventTypeRepository = webhookContainer.get<EventTypeRepository>(
      WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY
    );

    // Create user
    const user = await userRepository.create({
      email: `wh-ext-${testId}@example.com`,
      username: `wh-ext-${testId}`,
      name: "Webhook Extended Test User",
      organizationId: null,
      creationSource: CreationSource.WEBAPP,
      locked: false,
    });
    userId = user.id;

    // Create teams
    const team = await prisma.team.create({
      data: { name: `wh-ext-team-${testId}`, slug: `wh-ext-team-${testId}` },
    });
    teamId = team.id;

    const team2 = await prisma.team.create({
      data: { name: `wh-ext-team2-${testId}`, slug: `wh-ext-team2-${testId}` },
    });
    team2Id = team2.id;

    // Create org (team with isOrganization=true)
    const org = await prisma.team.create({
      data: {
        name: `wh-ext-org-${testId}`,
        slug: `wh-ext-org-${testId}`,
        isOrganization: true,
      },
    });
    orgId = org.id;

    // Create memberships
    await prisma.membership.create({
      data: { teamId, userId, role: MembershipRole.ADMIN, accepted: true },
    });
    await prisma.membership.create({
      data: { teamId: team2Id, userId, role: MembershipRole.MEMBER, accepted: true },
    });

    // Create event types
    const et = await eventTypeRepository.create({
      title: "Webhook Extended ET",
      slug: `wh-ext-et-${testId}`,
      length: 30,
      userId,
    });
    eventTypeId = et.id;

    // Create managed parent event type
    const parentET = await prisma.eventType.create({
      data: {
        title: "Webhook Managed Parent",
        slug: `wh-ext-parent-${testId}`,
        length: 30,
        userId,
      },
    });
    managedParentETId = parentET.id;

    // Create managed child event type referencing parent
    const childET = await prisma.eventType.create({
      data: {
        title: "Webhook Managed Child",
        slug: `wh-ext-child-${testId}`,
        length: 30,
        userId,
        parentId: managedParentETId,
      },
    });
    managedChildETId = childET.id;

    // Create PlatformOAuthClient for OAuth webhook tests
    const oauthClient = await prisma.platformOAuthClient.create({
      data: {
        id: `oauth-client-${testId}`,
        name: `wh-ext-oauth-client-${testId}`,
        secret: "test-secret",
        permissions: 0,
        redirectUris: [],
        organizationId: orgId,
      },
    });
    oauthClientId = oauthClient.id;
  });

  afterAll(async () => {
    // Clean up webhooks
    if (webhookIds.length > 0) {
      await prisma.webhook.deleteMany({ where: { id: { in: webhookIds } } });
    }
    // Clean up event types (child before parent due to FK)
    await prisma.eventType.deleteMany({
      where: { id: { in: [managedChildETId, eventTypeId] } },
    });
    await prisma.eventType.deleteMany({
      where: { id: managedParentETId },
    });
    // Clean up OAuth client
    if (oauthClientId) {
      await prisma.platformOAuthClient.deleteMany({ where: { id: oauthClientId } });
    }
    // Clean up memberships
    await prisma.membership.deleteMany({ where: { userId } });
    // Clean up teams
    await prisma.team.deleteMany({ where: { id: { in: [teamId, team2Id, orgId] } } });
    // Clean up user data
    await prisma.availability.deleteMany({ where: { Schedule: { userId } } });
    await prisma.schedule.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  // Helper to create a webhook and track for cleanup
  async function createWebhook(data: Parameters<typeof prisma.webhook.create>[0]["data"]) {
    const wh = await prisma.webhook.create({ data });
    webhookIds.push(wh.id);
    return wh;
  }

  // ─── getSubscribers additional scenarios ────────────────────────────

  describe("getSubscribers (extended)", () => {
    it("should return managed parent event type webhooks when child eventTypeId is queried", async () => {
      const parentWh = await createWebhook({
        id: `wh-ext-parent-wh-${testId}`,
        eventTypeId: managedParentETId,
        subscriberUrl: `https://example.com/parent-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        eventTypeId: managedChildETId,
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(parentWh.id);
    });

    it("should return OAuth client webhooks when oAuthClientId is provided", async () => {
      const oauthWh = await createWebhook({
        id: `wh-ext-oauth-${testId}`,
        platformOAuthClientId: `oauth-client-${testId}`,
        subscriberUrl: `https://example.com/oauth-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        oAuthClientId: `oauth-client-${testId}`,
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(oauthWh.id);
    });

    it("should exclude inactive webhooks", async () => {
      const inactiveWh = await createWebhook({
        id: `wh-ext-inactive-${testId}`,
        userId,
        subscriberUrl: `https://example.com/inactive-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: false,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId,
      });

      const ids = result.map((w) => w.id);
      expect(ids).not.toContain(inactiveWh.id);
    });

    it("should exclude webhooks not matching the trigger event", async () => {
      const wrongTriggerWh = await createWebhook({
        id: `wh-ext-wrongtrig-${testId}`,
        userId,
        subscriberUrl: `https://example.com/wrongtrig-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId,
      });

      const ids = result.map((w) => w.id);
      expect(ids).not.toContain(wrongTriggerWh.id);
    });

    it("should deduplicate webhooks appearing in multiple UNION branches", async () => {
      const dedupeWh = await createWebhook({
        id: `wh-ext-dedupe-${testId}`,
        userId,
        subscriberUrl: `https://example.com/dedupe-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId,
      });

      const matchingIds = result.filter((w) => w.id === dedupeWh.id);
      expect(matchingIds.length).toBe(1);
    });

    it("should query all teams when teamId is an array", async () => {
      const teamWh1 = await createWebhook({
        id: `wh-ext-arr-t1-${testId}`,
        teamId,
        subscriberUrl: `https://example.com/arr-t1-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });
      const teamWh2 = await createWebhook({
        id: `wh-ext-arr-t2-${testId}`,
        teamId: team2Id,
        subscriberUrl: `https://example.com/arr-t2-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        teamId: [teamId, team2Id],
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(teamWh1.id);
      expect(ids).toContain(teamWh2.id);
    });

    it("should merge orgId with teamIds", async () => {
      const orgWh = await createWebhook({
        id: `wh-ext-org-wh-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/org-wh-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        teamId: teamId,
        orgId,
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(orgWh.id);
    });

    it("should return empty array when no matching webhooks exist for userId", async () => {
      const result = await repository.getSubscribers({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId: 999999999,
      });

      expect(Array.isArray(result)).toBe(true);
      const userSpecific = result.filter((w) => w.subscriberUrl.includes("999999999"));
      expect(userSpecific).toHaveLength(0);
    });
  });

  // ─── getWebhookById ──────────────────────────────────────────────────

  describe("getWebhookById", () => {
    it("should return full WebhookSubscriber shape for existing webhook", async () => {
      const wh = await createWebhook({
        id: `wh-ext-getbyid-${testId}`,
        userId,
        subscriberUrl: `https://example.com/getbyid-${testId}`,
        payloadTemplate: '{"test": true}',
        secret: "test-secret-123",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        time: 10,
        timeUnit: "MINUTE",
      });

      const result = await repository.getWebhookById(wh.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(wh.id);
      expect(result!.subscriberUrl).toBe(wh.subscriberUrl);
      expect(result!.payloadTemplate).toBe('{"test": true}');
      expect(result!.secret).toBe("test-secret-123");
      expect(result!.time).toBe(10);
      expect(result!.timeUnit).toBe("MINUTE");
      expect(result!.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CREATED);
      expect(result!.version).toBe("2021-10-20");
    });

    it("should return null for non-existent webhook id", async () => {
      const result = await repository.getWebhookById("non-existent-webhook-id");
      expect(result).toBeNull();
    });

    it("should parse version correctly via parseWebhookVersion", async () => {
      const wh = await createWebhook({
        id: `wh-ext-version-${testId}`,
        userId,
        subscriberUrl: `https://example.com/version-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getWebhookById(wh.id);
      expect(result).not.toBeNull();
      expect(result!.version).toBe("2021-10-20");
    });

    it("should preserve timeUnit as correct enum value", async () => {
      const wh = await createWebhook({
        id: `wh-ext-timeunit-${testId}`,
        userId,
        subscriberUrl: `https://example.com/timeunit-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        time: 5,
        timeUnit: "HOUR",
      });

      const result = await repository.getWebhookById(wh.id);
      expect(result).not.toBeNull();
      expect(result!.timeUnit).toBe("HOUR");
    });
  });

  // ─── findByWebhookId ─────────────────────────────────────────────────

  describe("findByWebhookId", () => {
    it("should return full shape including teamId, userId, platform", async () => {
      const wh = await createWebhook({
        id: `wh-ext-findby-${testId}`,
        userId,
        subscriberUrl: `https://example.com/findby-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED, WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
        secret: "find-secret",
      });

      const result = await repository.findByWebhookId(wh.id);

      expect(result.id).toBe(wh.id);
      expect(result.subscriberUrl).toBe(wh.subscriberUrl);
      expect(result.userId).toBe(userId);
      expect(result.teamId).toBeNull();
      expect(result.platform).toBe(false);
      expect(result.active).toBe(true);
      expect(result.secret).toBe("find-secret");
      expect(result.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CREATED);
      expect(result.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CANCELLED);
    });

    it("should throw for non-existent webhook id (findUniqueOrThrow)", async () => {
      await expect(repository.findByWebhookId("non-existent-find-id")).rejects.toThrow();
    });

    it("should parse version via parseWebhookVersion", async () => {
      const wh = await createWebhook({
        id: `wh-ext-findver-${testId}`,
        userId,
        subscriberUrl: `https://example.com/findver-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.findByWebhookId(wh.id);
      expect(result.version).toBe("2021-10-20");
    });
  });

  // ─── findByOrgIdAndTrigger ────────────────────────────────────────────

  describe("findByOrgIdAndTrigger", () => {
    it("should return org webhooks with matching trigger", async () => {
      const orgWh = await createWebhook({
        id: `wh-ext-orgtrg-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/orgtrg-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        platform: false,
      });

      const result = await repository.findByOrgIdAndTrigger({
        orgId,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(orgWh.id);
    });

    it("should exclude platform webhooks (platform=false filter)", async () => {
      const platformOrgWh = await createWebhook({
        id: `wh-ext-orgplat-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/orgplat-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        platform: true,
      });

      const result = await repository.findByOrgIdAndTrigger({
        orgId,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      const ids = result.map((w) => w.id);
      expect(ids).not.toContain(platformOrgWh.id);
    });

    it("should exclude inactive webhooks", async () => {
      const inactiveOrgWh = await createWebhook({
        id: `wh-ext-orginact-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/orginact-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: false,
        platform: false,
      });

      const result = await repository.findByOrgIdAndTrigger({
        orgId,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      const ids = result.map((w) => w.id);
      expect(ids).not.toContain(inactiveOrgWh.id);
    });

    it("should return empty array for wrong trigger event", async () => {
      const result = await repository.findByOrgIdAndTrigger({
        orgId,
        triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      });

      const ourWebhooks = result.filter((w) => w.subscriberUrl.includes(testId));
      expect(ourWebhooks).toHaveLength(0);
    });

    it("should return multiple matching org webhooks", async () => {
      const orgWh1 = await createWebhook({
        id: `wh-ext-orgmulti1-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/orgmulti1-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
        platform: false,
      });
      const orgWh2 = await createWebhook({
        id: `wh-ext-orgmulti2-${testId}`,
        teamId: orgId,
        subscriberUrl: `https://example.com/orgmulti2-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
        platform: false,
      });

      const result = await repository.findByOrgIdAndTrigger({
        orgId,
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      });

      const ids = result.map((w) => w.id);
      expect(ids).toContain(orgWh1.id);
      expect(ids).toContain(orgWh2.id);
    });
  });

  // ─── getFilteredWebhooksForUser ───────────────────────────────────────

  describe("getFilteredWebhooksForUser", () => {
    it("should return user's personal webhooks", async () => {
      const personalWh = await createWebhook({
        id: `wh-ext-personal-${testId}`,
        userId,
        subscriberUrl: `https://example.com/personal-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getFilteredWebhooksForUser({ userId });
      const allWebhooks = result.webhookGroups.flatMap((g) => g.webhooks);
      const ids = allWebhooks.map((w) => w.id);
      expect(ids).toContain(personalWh.id);
    });

    it("should filter out Zapier webhooks from personal group", async () => {
      const zapierWh = await createWebhook({
        id: `wh-ext-zapier-${testId}`,
        userId,
        subscriberUrl: `https://example.com/zapier-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        appId: "zapier",
      });

      const result = await repository.getFilteredWebhooksForUser({ userId });
      const allWebhooks = result.webhookGroups.flatMap((g) => g.webhooks);
      const ids = allWebhooks.map((w) => w.id);
      expect(ids).not.toContain(zapierWh.id);
    });

    it("should include team webhooks when user has read permission", async () => {
      const teamWh = await createWebhook({
        id: `wh-ext-teamread-${testId}`,
        teamId,
        subscriberUrl: `https://example.com/teamread-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getFilteredWebhooksForUser({ userId });
      const allWebhooks = result.webhookGroups.flatMap((g) => g.webhooks);
      const ids = allWebhooks.map((w) => w.id);
      expect(ids).toContain(teamWh.id);
    });

    it("should set canModify=true and canDelete=true for ADMIN role on team", async () => {
      await createWebhook({
        id: `wh-ext-adminperm-${testId}`,
        teamId,
        subscriberUrl: `https://example.com/adminperm-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getFilteredWebhooksForUser({ userId });
      const teamGroup = result.webhookGroups.find((g) => g.teamId === teamId);
      expect(teamGroup).toBeDefined();
      expect(teamGroup!.metadata?.canModify).toBe(true);
      expect(teamGroup!.metadata?.canDelete).toBe(true);
    });

    it("should set canModify=false and canDelete=false for MEMBER role on team", async () => {
      await createWebhook({
        id: `wh-ext-memberperm-${testId}`,
        teamId: team2Id,
        subscriberUrl: `https://example.com/memberperm-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.getFilteredWebhooksForUser({ userId });
      const team2Group = result.webhookGroups.find((g) => g.teamId === team2Id);
      expect(team2Group).toBeDefined();
      expect(team2Group!.metadata?.canModify).toBe(false);
      expect(team2Group!.metadata?.canDelete).toBe(false);
    });

    it("should include platform webhooks for ADMIN userRole", async () => {
      const platformWh = await createWebhook({
        id: `wh-ext-platform-${testId}`,
        subscriberUrl: `https://example.com/platform-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        platform: true,
      });

      const result = await repository.getFilteredWebhooksForUser({
        userId,
        userRole: UserPermissionRole.ADMIN,
      });
      const allWebhooks = result.webhookGroups.flatMap((g) => g.webhooks);
      const ids = allWebhooks.map((w) => w.id);
      expect(ids).toContain(platformWh.id);
    });

    it("should NOT include platform webhooks for non-ADMIN userRole", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      const platformGroup = result.webhookGroups.find(
        (g) => g.profile.slug === "Platform" && g.profile.name === "Platform"
      );
      expect(platformGroup).toBeUndefined();
    });

    it("should return multiple groups for user with multiple teams", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      const teamGroups = result.webhookGroups.filter((g) => g.teamId !== null);
      expect(teamGroups.length).toBeGreaterThanOrEqual(1);
    });

    it("should exclude groups with empty webhooks from webhookGroups", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      for (const group of result.webhookGroups) {
        expect(group.webhooks.length).toBeGreaterThan(0);
      }
    });

    it("should have correct profile data (slug, name)", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      const personalGroup = result.webhookGroups.find((g) => g.teamId === null || g.teamId === undefined);
      if (personalGroup) {
        expect(personalGroup.profile.slug).toBe(`wh-ext-${testId}`);
        expect(personalGroup.profile.name).toBe("Webhook Extended Test User");
      }
    });

    it("should return DTO-shaped webhooks (with version parsed)", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      const allWebhooks = result.webhookGroups.flatMap((g) => g.webhooks);
      for (const wh of allWebhooks) {
        expect(wh).toHaveProperty("id");
        expect(wh).toHaveProperty("subscriberUrl");
        expect(wh).toHaveProperty("eventTriggers");
        expect(wh).toHaveProperty("version");
        expect(wh.version).toBe("2021-10-20");
      }
    });

    it("should throw 'User not found' for non-existent userId", async () => {
      await expect(repository.getFilteredWebhooksForUser({ userId: 999999999 })).rejects.toThrow(
        "User not found"
      );
    });

    it("should return profiles array matching groups", async () => {
      const result = await repository.getFilteredWebhooksForUser({ userId });
      expect(result.profiles).toBeDefined();
      expect(Array.isArray(result.profiles)).toBe(true);
      expect(result.profiles.length).toBeGreaterThanOrEqual(result.webhookGroups.length);
    });
  });

  // ─── listWebhooks ────────────────────────────────────────────────────

  describe("listWebhooks", () => {
    it("should exclude Zapier/Make webhooks by default (appId=null)", async () => {
      const zapierWh = await createWebhook({
        id: `wh-ext-listzap-${testId}`,
        userId,
        subscriberUrl: `https://example.com/listzap-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        appId: "zapier",
      });

      const result = await repository.listWebhooks({ userId });
      const ids = result.map((w) => w.id);
      expect(ids).not.toContain(zapierWh.id);
    });

    it("should return matching webhooks when explicit appId is provided", async () => {
      const zapierWh2 = await createWebhook({
        id: `wh-ext-listapp-${testId}`,
        userId,
        subscriberUrl: `https://example.com/listapp-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        appId: "zapier",
      });

      const result = await repository.listWebhooks({ userId, appId: "zapier" });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(zapierWh2.id);
    });

    it("should filter by eventTypeId when provided", async () => {
      const etWh = await createWebhook({
        id: `wh-ext-listet-${testId}`,
        eventTypeId,
        subscriberUrl: `https://example.com/listet-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.listWebhooks({ userId, eventTypeId });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(etWh.id);
    });

    it("should include managed parent webhooks when querying child event type", async () => {
      const parentWh = await createWebhook({
        id: `wh-ext-listmngd-${testId}`,
        eventTypeId: managedParentETId,
        subscriberUrl: `https://example.com/listmngd-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.listWebhooks({ userId, eventTypeId: managedChildETId });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(parentWh.id);
    });

    it("should return user + allowed team webhooks when no eventTypeId", async () => {
      const userWh = await createWebhook({
        id: `wh-ext-listuser-${testId}`,
        userId,
        subscriberUrl: `https://example.com/listuser-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.listWebhooks({ userId });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(userWh.id);
    });

    it("should filter by eventTriggers when provided", async () => {
      const trigWh = await createWebhook({
        id: `wh-ext-listtrig-${testId}`,
        userId,
        subscriberUrl: `https://example.com/listtrig-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED, WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
      });

      const result = await repository.listWebhooks({
        userId,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED, WebhookTriggerEvents.BOOKING_CANCELLED],
      });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(trigWh.id);
    });

    it("should return DTO-shaped webhooks via WebhookOutputMapper", async () => {
      const result = await repository.listWebhooks({ userId });
      for (const wh of result) {
        expect(wh).toHaveProperty("id");
        expect(wh).toHaveProperty("subscriberUrl");
        expect(wh).toHaveProperty("eventTriggers");
        expect(wh).toHaveProperty("version");
        expect(wh).toHaveProperty("createdAt");
        expect(wh).toHaveProperty("platform");
        expect(wh.version).toBe("2021-10-20");
      }
    });

    it("should return empty array when no webhooks match eventTriggers filter", async () => {
      const result = await repository.listWebhooks({
        userId,
        eventTriggers: [WebhookTriggerEvents.FORM_SUBMITTED],
      });
      const ourWebhooks = result.filter((w) => w.subscriberUrl.includes(testId));
      expect(ourWebhooks).toHaveLength(0);
    });

    it("should apply combined filters (eventTypeId + eventTriggers)", async () => {
      const combinedWh = await createWebhook({
        id: `wh-ext-listcomb-${testId}`,
        eventTypeId,
        subscriberUrl: `https://example.com/listcomb-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
        active: true,
      });

      const result = await repository.listWebhooks({
        userId,
        eventTypeId,
        eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
      });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(combinedWh.id);
    });

    it("should return only direct ET webhooks when managed parent does not exist", async () => {
      const directWh = await createWebhook({
        id: `wh-ext-listdirect-${testId}`,
        eventTypeId,
        subscriberUrl: `https://example.com/listdirect-${testId}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      });

      const result = await repository.listWebhooks({ userId, eventTypeId });
      const ids = result.map((w) => w.id);
      expect(ids).toContain(directWh.id);
    });
  });
});
