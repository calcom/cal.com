import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteHandler } from "./delete.handler";

let user: User;
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

describe("webhook.delete - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `wh-delete-${timestamp}`,
        email: `wh-delete-${timestamp}@example.com`,
        name: "Webhook Delete Test User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.webhook.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should delete a user-level webhook", async () => {
    const webhook = await prisma.webhook.create({
      data: {
        id: `wh-del-${timestamp}`,
        subscriberUrl: "https://example.com/delete-webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
        userId: user.id,
      },
    });

    const result = await deleteHandler({
      ctx: createCtx(user),
      input: { id: webhook.id },
    });

    expect(result.id).toBe(webhook.id);

    const deleted = await prisma.webhook.findUnique({ where: { id: webhook.id } });
    expect(deleted).toBeNull();
  });

  it("should handle deletion of non-existent webhook gracefully", async () => {
    const result = await deleteHandler({
      ctx: createCtx(user),
      input: { id: "non-existent-webhook-id" },
    });

    expect(result.id).toBe("non-existent-webhook-id");
  });
});
