import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHandler } from "./create.handler";

let user: User;
const timestamp = Date.now();
const createdWebhookIds: string[] = [];

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("webhook.create - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `wh-create-${timestamp}`,
        email: `wh-create-${timestamp}@example.com`,
        name: "Webhook Create Test User",
      },
    });
  });

  afterAll(async () => {
    try {
      if (createdWebhookIds.length > 0) {
        await prisma.webhookScheduledTriggers.deleteMany({
          where: { webhookId: { in: createdWebhookIds } },
        });
        await prisma.webhook.deleteMany({ where: { id: { in: createdWebhookIds } } });
      }
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should create a user-level webhook", async () => {
    const result = await createHandler({
      ctx: createCtx(user),
      input: {
        subscriberUrl: "https://example.com/webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        payloadTemplate: null,
      },
    });

    createdWebhookIds.push(result.id);
    expect(result.subscriberUrl).toBe("https://example.com/webhook");
    expect(result.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CREATED);
    expect(result.active).toBe(true);
    expect(result.userId).toBe(user.id);
  });

  it("should create a webhook with multiple event triggers", async () => {
    const result = await createHandler({
      ctx: createCtx(user),
      input: {
        subscriberUrl: "https://example.com/webhook-multi",
        eventTriggers: [
          WebhookTriggerEvents.BOOKING_CREATED,
          WebhookTriggerEvents.BOOKING_CANCELLED,
          WebhookTriggerEvents.BOOKING_RESCHEDULED,
        ],
        active: true,
        payloadTemplate: null,
      },
    });

    createdWebhookIds.push(result.id);
    expect(result.eventTriggers.length).toBe(3);
  });

  it("should throw UNAUTHORIZED when non-admin tries to create platform webhook", async () => {
    await expect(
      createHandler({
        ctx: createCtx(user),
        input: {
          subscriberUrl: "https://example.com/platform",
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          active: true,
          payloadTemplate: null,
          platform: true,
        },
      })
    ).rejects.toThrow();
  });
});
