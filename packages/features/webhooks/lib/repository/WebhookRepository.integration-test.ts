import { DI_TOKENS } from "@calcom/features/di/tokens";
import { getWebhookFeature, webhookContainer } from "@calcom/features/di/webhooks/containers/webhook";
import { WEBHOOK_TOKENS } from "@calcom/features/di/webhooks/Webhooks.tokens";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { IWebhookRepository } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Webhook } from "@calcom/prisma/client";
import { CreationSource, WebhookTriggerEvents } from "@calcom/prisma/enums";
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
    teamRepository = new TeamRepository(prismaClient);
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
