import prisma from "@calcom/prisma";
import type { User, Webhook } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { editHandler } from "./edit.handler";

let user: User;
let webhook: Webhook;
const timestamp = Date.now();

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

describe("webhook.edit - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `wh-edit-${timestamp}`,
        email: `wh-edit-${timestamp}@example.com`,
        name: "Webhook Edit Test User",
      },
    });

    webhook = await prisma.webhook.create({
      data: {
        id: `wh-edit-${timestamp}`,
        subscriberUrl: "https://example.com/edit-webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.webhookScheduledTriggers.deleteMany({
        where: { webhookId: webhook?.id },
      });
      await prisma.webhook.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should update webhook subscriber URL", async () => {
    const result = await editHandler({
      ctx: createCtx(user),
      input: {
        id: webhook.id,
        subscriberUrl: "https://example.com/updated-webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        payloadTemplate: null,
      },
    });

    expect(result?.subscriberUrl).toBe("https://example.com/updated-webhook");
  });

  it("should update webhook event triggers", async () => {
    const result = await editHandler({
      ctx: createCtx(user),
      input: {
        id: webhook.id,
        subscriberUrl: "https://example.com/updated-webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED, WebhookTriggerEvents.BOOKING_CANCELLED],
        payloadTemplate: null,
      },
    });

    expect(result?.eventTriggers).toContain(WebhookTriggerEvents.BOOKING_CANCELLED);
  });

  it("should return null for non-existent webhook", async () => {
    const result = await editHandler({
      ctx: createCtx(user),
      input: {
        id: "non-existent-webhook-id",
        subscriberUrl: "https://example.com/nope",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        payloadTemplate: null,
      },
    });

    expect(result).toBeNull();
  });
});
