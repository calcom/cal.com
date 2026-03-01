import { DailyLocationType } from "@calcom/app-store/constants";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

const mockTaskerCreate = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/tasker", () => ({
  default: { create: (...args: unknown[]) => mockTaskerCreate(...args) },
}));

const mockGetWebhooks = vi.fn();
vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: (...args: unknown[]) => mockGetWebhooks(...args),
}));

import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

describe("scheduleNoShowTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWebhooks.mockResolvedValue([]);
  });

  const baseArgs = {
    booking: {
      startTime: new Date("2025-06-01T10:00:00Z"),
      id: 1,
      location: DailyLocationType,
      uid: "booking-uid-123",
    },
    organizerUser: { id: 42 },
    eventTypeId: 10,
    teamId: null,
    orgId: null,
  };

  it("does nothing when isDryRun is true", async () => {
    await scheduleNoShowTriggers({ ...baseArgs, isDryRun: true });

    expect(mockGetWebhooks).not.toHaveBeenCalled();
    expect(mockTaskerCreate).not.toHaveBeenCalled();
  });

  it("does nothing when location is not Cal Video", async () => {
    await scheduleNoShowTriggers({
      ...baseArgs,
      booking: { ...baseArgs.booking, location: "https://zoom.us/j/123" },
    });

    expect(mockGetWebhooks).not.toHaveBeenCalled();
  });

  it("fetches both host and guest no-show webhooks for Cal Video bookings", async () => {
    await scheduleNoShowTriggers(baseArgs);

    expect(mockGetWebhooks).toHaveBeenCalledTimes(2);
    expect(mockGetWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      })
    );
    expect(mockGetWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      })
    );
  });

  it("creates tasker tasks for each host no-show webhook", async () => {
    mockGetWebhooks
      .mockResolvedValueOnce([
        { id: "wh1", time: 5, timeUnit: "MINUTE" },
        { id: "wh2", time: 10, timeUnit: "MINUTE" },
      ])
      .mockResolvedValueOnce([]);

    await scheduleNoShowTriggers(baseArgs);

    expect(mockTaskerCreate).toHaveBeenCalledTimes(2);
    expect(mockTaskerCreate).toHaveBeenCalledWith(
      "triggerHostNoShowWebhook",
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        bookingId: 1,
      }),
      expect.objectContaining({ referenceUid: "booking-uid-123" })
    );
  });

  it("creates tasker tasks for each guest no-show webhook", async () => {
    mockGetWebhooks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "wh3", time: 15, timeUnit: "MINUTE" }]);

    await scheduleNoShowTriggers(baseArgs);

    expect(mockTaskerCreate).toHaveBeenCalledTimes(1);
    expect(mockTaskerCreate).toHaveBeenCalledWith(
      "triggerGuestNoShowWebhook",
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        bookingId: 1,
      }),
      expect.objectContaining({ referenceUid: "booking-uid-123" })
    );
  });

  it("skips webhook entries that have no time or timeUnit", async () => {
    mockGetWebhooks
      .mockResolvedValueOnce([{ id: "wh-no-time", time: null, timeUnit: null }])
      .mockResolvedValueOnce([]);

    await scheduleNoShowTriggers(baseArgs);

    expect(mockTaskerCreate).not.toHaveBeenCalled();
  });

  it("passes triggerForUser userId when triggerForUser is set", async () => {
    await scheduleNoShowTriggers({
      ...baseArgs,
      triggerForUser: true,
    });

    expect(mockGetWebhooks).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });

  it("passes null userId when triggerForUser is falsy", async () => {
    await scheduleNoShowTriggers({
      ...baseArgs,
      triggerForUser: null,
    });

    expect(mockGetWebhooks).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it("treats empty string location as Cal Video", async () => {
    await scheduleNoShowTriggers({
      ...baseArgs,
      booking: { ...baseArgs.booking, location: "  " },
    });

    expect(mockGetWebhooks).toHaveBeenCalledTimes(2);
  });
});
