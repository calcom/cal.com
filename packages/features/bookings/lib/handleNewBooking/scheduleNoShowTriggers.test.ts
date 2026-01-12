import { vi, describe, test, expect, beforeEach } from "vitest";

import { DailyLocationType } from "@calcom/app-store/constants";
import dayjs from "@calcom/dayjs";
import type { CalVideoSettings } from "@calcom/features/eventtypes/lib/types";
import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { WebhookTriggerEvents, TimeUnit } from "@calcom/prisma/enums";

import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

vi.mock("@calcom/features/tasker");
vi.mock("@calcom/features/webhooks/lib/getWebhooks");

describe("scheduleNoShowTriggers", () => {
  const mockTaskerCreate = vi.mocked(tasker.create);
  const mockGetWebhooks = vi.mocked(getWebhooks);

  const baseBooking = {
    startTime: dayjs().add(1, "day").toDate(),
    id: 123,
    location: DailyLocationType,
    uid: "test-booking-uid",
  };

  const baseArgs = {
    booking: baseBooking,
    triggerForUser: 101,
    organizerUser: { id: 101 },
    eventTypeId: 1,
    teamId: null,
    orgId: null,
    oAuthClientId: null,
    isDryRun: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no webhooks configured
    mockGetWebhooks.mockResolvedValue([]);
    // Default: tasker returns a task ID
    mockTaskerCreate.mockResolvedValue("task-id");
  });

  describe("Automatic tracking when toggles enabled", () => {
    test("Should schedule automatic host no-show tracking when enableAutomaticNoShowTrackingForHosts is true", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
        enableAutomaticNoShowTrackingForGuests: false,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify task was created for host tracking
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerHostNoShowWebhook",
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
          bookingId: baseBooking.id,
          isAutomaticTrackingOnly: true,
          webhook: expect.objectContaining({
            id: "automatic-tracking",
            subscriberUrl: "",
            time: 15,
            timeUnit: "MINUTE",
          }),
        }),
        expect.objectContaining({
          scheduledAt: expect.any(Date),
          referenceUid: baseBooking.uid,
        })
      );

      // Verify scheduled time is 15 minutes after start
      const callArgs = mockTaskerCreate.mock.calls[0];
      const scheduledAt = callArgs[2]?.scheduledAt as Date;
      const expectedTime = dayjs(baseBooking.startTime).add(15, "minutes");
      expect(dayjs(scheduledAt).unix()).toBe(expectedTime.unix());

      // Verify NO guest tracking task was created
      expect(mockTaskerCreate).toHaveBeenCalledTimes(1);
    });

    test("Should schedule automatic guest no-show tracking when enableAutomaticNoShowTrackingForGuests is true", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: false,
        enableAutomaticNoShowTrackingForGuests: true,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify task was created for guest tracking
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerGuestNoShowWebhook",
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
          bookingId: baseBooking.id,
          isAutomaticTrackingOnly: true,
          webhook: expect.objectContaining({
            id: "automatic-tracking",
            subscriberUrl: "",
            time: 15,
            timeUnit: "MINUTE",
          }),
        }),
        expect.objectContaining({
          scheduledAt: expect.any(Date),
          referenceUid: baseBooking.uid,
        })
      );

      // Verify NO host tracking task was created
      expect(mockTaskerCreate).toHaveBeenCalledTimes(1);
    });

    test("Should schedule both host and guest tracking when both toggles are enabled", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
        enableAutomaticNoShowTrackingForGuests: true,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify both tasks were created
      expect(mockTaskerCreate).toHaveBeenCalledTimes(2);

      // Verify host tracking task
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerHostNoShowWebhook",
        expect.objectContaining({
          isAutomaticTrackingOnly: true,
        }),
        expect.any(Object)
      );

      // Verify guest tracking task
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerGuestNoShowWebhook",
        expect.objectContaining({
          isAutomaticTrackingOnly: true,
        }),
        expect.any(Object)
      );
    });

    test("Should NOT schedule tasks when both toggles are disabled and no webhooks exist", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: false,
        enableAutomaticNoShowTrackingForGuests: false,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify no tasks were created
      expect(mockTaskerCreate).not.toHaveBeenCalled();
    });

    test("Should NOT schedule tasks when calVideoSettings is null", async () => {
      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings: null,
      });

      // Verify no tasks were created
      expect(mockTaskerCreate).not.toHaveBeenCalled();
    });
  });

  describe("Webhook precedence", () => {
    test("Should use webhook configuration when both webhook and toggle are enabled for hosts", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
      };

      const mockWebhook = {
        id: "webhook-123",
        subscriberUrl: "https://example.com/webhook",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        payloadTemplate: null,
        appId: null,
        secret: "secret-key",
        time: 10,
        timeUnit: TimeUnit.MINUTE,
      };

      mockGetWebhooks.mockResolvedValueOnce([mockWebhook]);

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify webhook task was created (NOT automatic tracking)
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerHostNoShowWebhook",
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
          bookingId: baseBooking.id,
          webhook: expect.objectContaining({
            id: "webhook-123",
            subscriberUrl: "https://example.com/webhook",
            time: 10,
            timeUnit: TimeUnit.MINUTE,
          }),
        }),
        expect.any(Object)
      );

      // Verify isAutomaticTrackingOnly is NOT set for webhook-based tracking
      const callArgs = mockTaskerCreate.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty("isAutomaticTrackingOnly");
    });

    test("Should use webhook configuration when both webhook and toggle are enabled for guests", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForGuests: true,
      };

      const mockWebhook = {
        id: "webhook-456",
        subscriberUrl: "https://example.com/guest-webhook",
        eventTriggers: [WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW],
        payloadTemplate: null,
        appId: null,
        secret: null,
        time: 20,
        timeUnit: TimeUnit.MINUTE,
      };

      // First call for host webhooks returns empty, second call for guest webhooks returns the mock
      mockGetWebhooks.mockResolvedValueOnce([]).mockResolvedValueOnce([mockWebhook]);

      await scheduleNoShowTriggers({
        ...baseArgs,
        calVideoSettings,
      });

      // Verify webhook task was created for guests
      expect(mockTaskerCreate).toHaveBeenCalledWith(
        "triggerGuestNoShowWebhook",
        expect.objectContaining({
          webhook: expect.objectContaining({
            id: "webhook-456",
            subscriberUrl: "https://example.com/guest-webhook",
          }),
        }),
        expect.any(Object)
      );

      // Verify isAutomaticTrackingOnly is NOT set
      const callArgs = mockTaskerCreate.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty("isAutomaticTrackingOnly");
    });
  });

  describe("Location validation", () => {
    test("Should NOT schedule tasks for non-Cal Video locations", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
        enableAutomaticNoShowTrackingForGuests: true,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        booking: {
          ...baseBooking,
          location: "integrations:zoom",
        },
        calVideoSettings,
      });

      // Verify no tasks were created (early return for non-Cal Video)
      expect(mockTaskerCreate).not.toHaveBeenCalled();
    });

    test("Should schedule tasks for empty location string (Cal Video default)", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        booking: {
          ...baseBooking,
          location: "",
        },
        calVideoSettings,
      });

      // Verify task was created (empty string is treated as Cal Video)
      expect(mockTaskerCreate).toHaveBeenCalledTimes(1);
    });

    test("Should NOT schedule tasks when isDryRun is true", async () => {
      const calVideoSettings: CalVideoSettings = {
        enableAutomaticNoShowTrackingForHosts: true,
        enableAutomaticNoShowTrackingForGuests: true,
      };

      await scheduleNoShowTriggers({
        ...baseArgs,
        isDryRun: true,
        calVideoSettings,
      });

      // Verify no tasks were created (dry run mode)
      expect(mockTaskerCreate).not.toHaveBeenCalled();
    });
  });
});
