import { describe, expect, vi, beforeEach, test } from "vitest";
import { NotificationChannel } from "@calcom/features/notifications/types";
import { NotificationAwareTasker } from "./NotificationAwareTasker";
import type { Tasker } from "./tasker";
import type { NotificationPreferenceService } from "@calcom/features/notifications/services/NotificationPreferenceService";

describe("NotificationAwareTasker", () => {
  let decorator: NotificationAwareTasker;
  let mockTasker: Tasker;
  let mockNotificationService: NotificationPreferenceService;

  beforeEach(() => {
    mockTasker = {
      create: vi.fn().mockResolvedValue("task-id-123"),
      cleanup: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue("cancelled-id"),
      cancelWithReference: vi.fn().mockResolvedValue("cancelled-ref-id"),
    };

    mockNotificationService = {
      isNotificationEnabled: vi.fn(),
    } as unknown as NotificationPreferenceService;

    decorator = new NotificationAwareTasker({
      tasker: mockTasker,
      notificationPreferenceService: mockNotificationService,
    });
  });

  describe("create", () => {
    test("should delegate to wrapped tasker when notificationContext is not provided", async () => {
      const result = await decorator.create("sendSms", "payload", {});

      expect(result).toBe("task-id-123");
      expect(mockTasker.create).toHaveBeenCalledWith("sendSms", "payload", {});
      expect(mockNotificationService.isNotificationEnabled).not.toHaveBeenCalled();
    });

    test("should create task when notification is enabled", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(true);

      const result = await decorator.create("sendSms", "payload", {
        notificationContext: {
          userId: 1,
          notificationType: "BOOKING_CONFIRMED",
          channel: NotificationChannel.SMS,
        },
      });

      expect(result).toBe("task-id-123");
      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalledWith({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.SMS,
      });
      expect(mockTasker.create).toHaveBeenCalledWith("sendSms", "payload", {});
    });

    test("should not create task when notification is disabled", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(false);

      const result = await decorator.create("sendSms", "payload", {
        notificationContext: {
          userId: 1,
          notificationType: "BOOKING_CONFIRMED",
          channel: NotificationChannel.SMS,
        },
      });

      expect(result).toBe("");
      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalled();
      expect(mockTasker.create).not.toHaveBeenCalled();
    });

    test("should remove notificationContext from options when delegating", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(true);

      await decorator.create("sendSms", "payload", {
        scheduledAt: new Date(),
        maxAttempts: 3,
        notificationContext: {
          userId: 1,
          notificationType: "BOOKING_CONFIRMED",
          channel: NotificationChannel.SMS,
        },
      });

      expect(mockTasker.create).toHaveBeenCalledWith("sendSms", "payload", {
        scheduledAt: expect.any(Date),
        maxAttempts: 3,
      });
    });
  });

  describe("cleanup", () => {
    test("should delegate to wrapped tasker", async () => {
      await decorator.cleanup();

      expect(mockTasker.cleanup).toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    test("should delegate to wrapped tasker", async () => {
      const result = await decorator.cancel("task-id");

      expect(result).toBe("cancelled-id");
      expect(mockTasker.cancel).toHaveBeenCalledWith("task-id");
    });
  });

  describe("cancelWithReference", () => {
    test("should delegate to wrapped tasker", async () => {
      const result = await decorator.cancelWithReference("ref-uid", "sendSms");

      expect(result).toBe("cancelled-ref-id");
      expect(mockTasker.cancelWithReference).toHaveBeenCalledWith("ref-uid", "sendSms");
    });
  });
});

