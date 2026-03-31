import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { addNotificationsSubscriptionHandler } from "./addNotificationsSubscription.handler";

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: prisma,
  prisma,
}));

vi.mock("@calcom/features/notifications/sendNotification", () => ({
  sendNotification: vi.fn(),
}));

const makeCtx = () =>
  ({
    user: { id: 42 },
  }) as Parameters<typeof addNotificationsSubscriptionHandler>[0]["ctx"];

const webPushSubscription = {
  endpoint: "https://example.com/push/123",
  expirationTime: null,
  keys: {
    auth: "auth-key",
    p256dh: "p256dh-key",
  },
};

describe("addNotificationsSubscriptionHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts web push subscriptions by user, type, and endpoint identifier", async () => {
    await addNotificationsSubscriptionHandler({
      ctx: makeCtx(),
      input: { subscription: JSON.stringify(webPushSubscription) },
    });

    expect(prisma.notificationsSubscriptions.upsert).toHaveBeenCalledWith({
      where: {
        userId_type_identifier: {
          userId: 42,
          type: "WEB_PUSH",
          identifier: webPushSubscription.endpoint,
        },
      },
      create: {
        userId: 42,
        subscription: JSON.stringify(webPushSubscription),
        type: "WEB_PUSH",
        platform: "WEB",
        identifier: webPushSubscription.endpoint,
      },
      update: {
        subscription: JSON.stringify(webPushSubscription),
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it("rejects malformed browser subscriptions with BAD_REQUEST", async () => {
    await expect(
      addNotificationsSubscriptionHandler({
        ctx: makeCtx(),
        input: { subscription: "{not-valid-json" },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  });
});
