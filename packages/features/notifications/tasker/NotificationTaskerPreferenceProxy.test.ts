import { describe, expect, vi, beforeEach, test } from "vitest";
import { NotificationChannel, NotificationType } from "../types";
import { NotificationTaskerPreferenceProxy } from "./NotificationTaskerPreferenceProxy";
import type { INotificationTasker } from "./INotificationTasker";
import type { BaseNotificationTaskerSendData } from "./types";
import type { NotificationPreferenceService } from "../services/NotificationPreferenceService";

describe("NotificationTaskerPreferenceProxy", () => {
  let proxy: NotificationTaskerPreferenceProxy<BaseNotificationTaskerSendData>;
  let mockRealTasker: INotificationTasker<BaseNotificationTaskerSendData>;
  let mockNotificationService: NotificationPreferenceService;

  beforeEach(() => {
    mockRealTasker = {
      send: vi.fn().mockResolvedValue({ runId: "task-id-123" }),
    };

    mockNotificationService = {
      isNotificationEnabled: vi.fn(),
    } as unknown as NotificationPreferenceService;

    proxy = new NotificationTaskerPreferenceProxy({
      realTasker: mockRealTasker,
      notificationPreferenceService: mockNotificationService,
    });
  });

  describe("send", () => {
    test("should delegate to real tasker when notification is enabled", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(true);

      const sendData: BaseNotificationTaskerSendData = {
        userId: 1,
        teamId: null,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
      };

      const result = await proxy.send(sendData);

      expect(result).toEqual({ runId: "task-id-123" });
      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalledWith({
        userId: 1,
        teamId: null,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
      });
      expect(mockRealTasker.send).toHaveBeenCalledWith(sendData);
    });

    test("should block notification when preference is disabled", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(false);

      const sendData: BaseNotificationTaskerSendData = {
        userId: 1,
        teamId: 10,
        notificationType: NotificationType.BOOKING_RESCHEDULED,
        channel: NotificationChannel.SMS,
      };

      const result = await proxy.send(sendData);

      expect(result).toEqual({ runId: "notification-blocked-by-preference" });
      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalledWith({
        userId: 1,
        teamId: 10,
        notificationType: NotificationType.BOOKING_RESCHEDULED,
        channel: NotificationChannel.SMS,
      });
      expect(mockRealTasker.send).not.toHaveBeenCalled();
    });

    test("should extract notification context correctly from send data", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(true);

      const sendData: BaseNotificationTaskerSendData = {
        userId: 42,
        teamId: 100,
        notificationType: NotificationType.BOOKING_REQUESTED,
        channel: NotificationChannel.EMAIL,
      };

      await proxy.send(sendData);

      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalledWith({
        userId: 42,
        teamId: 100,
        notificationType: NotificationType.BOOKING_REQUESTED,
        channel: NotificationChannel.EMAIL,
      });
    });

    test("should handle null teamId correctly", async () => {
      vi.mocked(mockNotificationService.isNotificationEnabled).mockResolvedValue(true);

      const sendData: BaseNotificationTaskerSendData = {
        userId: 1,
        teamId: null,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
      };

      await proxy.send(sendData);

      expect(mockNotificationService.isNotificationEnabled).toHaveBeenCalledWith({
        userId: 1,
        teamId: null,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
      });
    });
  });
});

