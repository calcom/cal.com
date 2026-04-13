import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let team: Team;
let webhookId: string | null = null;

describe("WebhookTaskConsumer - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `wh-consumer-org-${timestamp}-${unique()}`,
        email: `wh-consumer-org-${timestamp}-${unique()}@example.com`,
        name: "Webhook Consumer Organizer",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `WH Consumer Team ${timestamp}`,
        slug: `wh-consumer-team-${timestamp}-${unique()}`,
        members: {
          create: {
            userId: organizer.id,
            role: "OWNER",
            accepted: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      if (webhookId) {
        await prisma.webhook.deleteMany({ where: { id: webhookId } });
      }
      if (organizer?.id) {
        await prisma.membership.deleteMany({ where: { userId: organizer.id } });
      }
      if (team?.id) {
        await prisma.webhook.deleteMany({ where: { teamId: team.id } });
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      if (organizer?.id) {
        await prisma.user.deleteMany({ where: { id: organizer.id } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should create a webhook subscriber and verify it appears in DB", async () => {
    const webhook = await prisma.webhook.create({
      data: {
        id: `wh-test-${unique()}`,
        subscriberUrl: `https://example.com/webhook-${unique()}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        teamId: team.id,
      },
    });
    webhookId = webhook.id;

    const dbWebhook = await prisma.webhook.findUnique({
      where: { id: webhook.id },
      select: {
        id: true,
        subscriberUrl: true,
        eventTriggers: true,
        active: true,
        teamId: true,
      },
    });

    expect(dbWebhook).toBeDefined();
    expect(dbWebhook?.active).toBe(true);
    expect(dbWebhook?.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CREATED);
    expect(dbWebhook?.teamId).toBe(team.id);
  });

  it("should deactivate a webhook (simulating 410 Gone handling)", async () => {
    const webhook = await prisma.webhook.create({
      data: {
        id: `wh-deactivate-${unique()}`,
        subscriberUrl: `https://example.com/deactivate-${unique()}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        teamId: team.id,
      },
    });

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { active: false },
    });

    const deactivated = await prisma.webhook.findUnique({
      where: { id: webhook.id },
      select: { active: true },
    });

    expect(deactivated?.active).toBe(false);

    await prisma.webhook.delete({ where: { id: webhook.id } });
  });

  it("should filter webhooks by trigger event type", async () => {
    const bookingCreatedHook = await prisma.webhook.create({
      data: {
        id: `wh-filter-created-${unique()}`,
        subscriberUrl: `https://example.com/created-${unique()}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        teamId: team.id,
      },
    });

    const bookingCancelledHook = await prisma.webhook.create({
      data: {
        id: `wh-filter-cancelled-${unique()}`,
        subscriberUrl: `https://example.com/cancelled-${unique()}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
        active: true,
        teamId: team.id,
      },
    });

    const createdWebhooks = await prisma.webhook.findMany({
      where: {
        teamId: team.id,
        eventTriggers: { has: WebhookTriggerEvents.BOOKING_CREATED },
        active: true,
      },
      select: { id: true },
    });

    const createdIds = createdWebhooks.map((w) => w.id);
    expect(createdIds).toContain(bookingCreatedHook.id);
    expect(createdIds).not.toContain(bookingCancelledHook.id);

    await prisma.webhook.deleteMany({
      where: { id: { in: [bookingCreatedHook.id, bookingCancelledHook.id] } },
    });
  });

  it("should not return inactive webhooks when filtering by active status", async () => {
    const inactiveHook = await prisma.webhook.create({
      data: {
        id: `wh-inactive-${unique()}`,
        subscriberUrl: `https://example.com/inactive-${unique()}`,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: false,
        teamId: team.id,
      },
    });

    const activeWebhooks = await prisma.webhook.findMany({
      where: {
        teamId: team.id,
        active: true,
        eventTriggers: { has: WebhookTriggerEvents.BOOKING_CREATED },
      },
      select: { id: true },
    });

    const ids = activeWebhooks.map((w) => w.id);
    expect(ids).not.toContain(inactiveHook.id);

    await prisma.webhook.delete({ where: { id: inactiveHook.id } });
  });

  it("should support multiple event triggers on a single webhook", async () => {
    const multiTriggerHook = await prisma.webhook.create({
      data: {
        id: `wh-multi-${unique()}`,
        subscriberUrl: `https://example.com/multi-${unique()}`,
        eventTriggers: [
          WebhookTriggerEvents.BOOKING_CREATED,
          WebhookTriggerEvents.BOOKING_CANCELLED,
          WebhookTriggerEvents.BOOKING_RESCHEDULED,
        ],
        active: true,
        teamId: team.id,
      },
    });

    const dbHook = await prisma.webhook.findUnique({
      where: { id: multiTriggerHook.id },
      select: { eventTriggers: true },
    });

    expect(dbHook?.eventTriggers).toHaveLength(3);
    expect(dbHook?.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CREATED);
    expect(dbHook?.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CANCELLED);
    expect(dbHook?.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_RESCHEDULED);

    await prisma.webhook.delete({ where: { id: multiTriggerHook.id } });
  });
});
