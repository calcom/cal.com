import { afterEach, describe, expect, it, vi } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

const sendNotification = vi.fn();

vi.mock("@calcom/features/notifications/sendNotification", () => ({
  sendNotification,
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    notificationsSubscriptions: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("addNotificationsSubscriptionHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses WEBAPP_URL for the test notification link", async () => {
    const { addNotificationsSubscriptionHandler } = await import("./addNotificationsSubscription.handler");

    await addNotificationsSubscriptionHandler({
      ctx: {
        user: {
          id: 1,
          locale: "en",
        } as never,
      },
      input: {
        subscription: JSON.stringify({
          endpoint: "https://example.com/push",
          keys: {
            auth: "auth",
            p256dh: "p256dh",
          },
        }),
      },
    });

    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        url: WEBAPP_URL,
        title: "test_notification_title",
        body: "test_notification_body",
      })
    );
  });
});
