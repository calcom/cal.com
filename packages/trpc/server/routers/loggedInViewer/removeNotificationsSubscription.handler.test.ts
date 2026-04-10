import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { removeNotificationsSubscriptionHandler } from "./removeNotificationsSubscription.handler";

vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: prisma,
  prisma,
}));

const makeCtx = () =>
  ({
    user: { id: 42 },
  }) as Parameters<typeof removeNotificationsSubscriptionHandler>[0]["ctx"];

const webPushSubscription = {
  endpoint: "https://example.com/push/456",
  expirationTime: null,
  keys: {
    auth: "auth-key",
    p256dh: "p256dh-key",
  },
};

describe("removeNotificationsSubscriptionHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the exact web push subscription by endpoint identifier", async () => {
    vi.mocked(prisma.notificationsSubscriptions.deleteMany).mockResolvedValue({ count: 1 });

    await removeNotificationsSubscriptionHandler({
      ctx: makeCtx(),
      input: { subscription: JSON.stringify(webPushSubscription) },
    });

    expect(prisma.notificationsSubscriptions.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 42,
        type: "WEB_PUSH",
        identifier: webPushSubscription.endpoint,
      },
    });
  });

  it("rejects malformed browser subscriptions with BAD_REQUEST", async () => {
    await expect(
      removeNotificationsSubscriptionHandler({
        ctx: makeCtx(),
        input: { subscription: "{not-valid-json" },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  });

  it("lets unexpected errors bubble without masking as BAD_REQUEST", async () => {
    const dbError = new Error("Connection refused");
    vi.mocked(prisma.notificationsSubscriptions.deleteMany).mockRejectedValue(dbError);

    await expect(
      removeNotificationsSubscriptionHandler({
        ctx: makeCtx(),
        input: { subscription: JSON.stringify(webPushSubscription) },
      })
    ).rejects.toThrow(dbError);
  });
});
