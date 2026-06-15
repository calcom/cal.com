import { prisma } from "@calcom/prisma/__mocks__/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addNotificationsSubscriptionHandler } from "./addNotificationsSubscription.handler";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
}));

const { SELF_HOSTED_URL, sendNotificationMock } = vi.hoisted(() => ({
  SELF_HOSTED_URL: "https://cal.example.com",
  sendNotificationMock: vi.fn(),
}));

vi.mock("@calcom/features/notifications/sendNotification", () => ({
  sendNotification: (...args: unknown[]) => sendNotificationMock(...args),
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return { ...actual, WEBAPP_URL: SELF_HOSTED_URL };
});

const VALID_SUBSCRIPTION = JSON.stringify({
  endpoint: "https://push.example.com/sub-1",
  keys: { auth: "auth-key", p256dh: "p256dh-key" },
});

function createMockUser() {
  return { id: 1 } as unknown as NonNullable<TrpcSessionUser>;
}

describe("addNotificationsSubscription.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.notificationsSubscriptions.findFirst.mockResolvedValue(null);
    prisma.notificationsSubscriptions.create.mockResolvedValue({} as never);
  });

  it("sends the test notification to the configured WEBAPP_URL, not a hardcoded cal.com URL", async () => {
    await addNotificationsSubscriptionHandler({
      ctx: { user: createMockUser() },
      input: { subscription: VALID_SUBSCRIPTION },
    });

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    const payload = sendNotificationMock.mock.calls[0][0];
    expect(payload.url).toBe(SELF_HOSTED_URL);
    expect(payload.url).not.toBe("https://app.cal.com/");
  });

  it("throws a BAD_REQUEST instead of an uncaught error when the subscription is not valid JSON", async () => {
    await expect(
      addNotificationsSubscriptionHandler({
        ctx: { user: createMockUser() },
        input: { subscription: "not-json{" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
