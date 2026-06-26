import { describe, it, expect, vi, beforeEach } from "vitest";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

const { createMock, getWebhooksMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getWebhooksMock: vi.fn(),
}));

vi.mock("@calcom/features/tasker", () => ({ default: { create: createMock } }));
vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({ default: getWebhooksMock }));

import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

const hostSubscriber = (id: string) => ({
  id,
  time: 5,
  timeUnit: "MINUTE",
  subscriberUrl: `https://example.com/${id}`,
  payloadTemplate: null,
  appId: null,
  secret: null,
});

describe("scheduleNoShowTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue("task-id");
  });

  it("uses a distinct referenceUid per subscriber so multiple no-show webhooks don't collide", async () => {
    // Two webhooks subscribed to the same host no-show trigger.
    getWebhooksMock.mockImplementation(async ({ triggerEvent }: { triggerEvent: WebhookTriggerEvents }) =>
      triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
        ? [hostSubscriber("wh-1"), hostSubscriber("wh-2")]
        : []
    );

    await scheduleNoShowTriggers({
      booking: { startTime: new Date("2030-01-01T10:00:00Z"), id: 1, location: "", uid: "BOOKING_UID" },
      triggerForUser: true,
      organizerUser: { id: 101 },
      eventTypeId: 1,
    });

    expect(createMock).toHaveBeenCalledTimes(2);

    const referenceUids = createMock.mock.calls.map((call) => call[2].referenceUid);
    // Each subscriber must get its own referenceUid; sharing booking.uid would collide on the
    // Task @@unique([referenceUid, type]) constraint and silently drop the 2nd subscriber's task.
    expect(new Set(referenceUids).size).toBe(2);
    expect(referenceUids).toEqual(["BOOKING_UID-wh-1", "BOOKING_UID-wh-2"]);
  });
});
