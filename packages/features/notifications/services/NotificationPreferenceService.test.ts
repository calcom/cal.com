import { describe, expect, vi, beforeEach, test } from "vitest";

import type { TeamNotificationPreferenceRepository } from "../repositories/TeamNotificationPreferenceRepository";
import type { UserNotificationPreferenceRepository } from "../repositories/UserNotificationPreferenceRepository";
import { NotificationChannel } from "../types";
import { NotificationPreferenceService } from "./NotificationPreferenceService";

describe("NotificationPreferenceService", () => {
  let service: NotificationPreferenceService;
  let mockUserRepo: UserNotificationPreferenceRepository;
  let mockTeamRepo: TeamNotificationPreferenceRepository;

  beforeEach(() => {
    mockUserRepo = {
      getPreference: vi.fn(),
      getAllPreferences: vi.fn(),
    } as unknown as UserNotificationPreferenceRepository;

    mockTeamRepo = {
      getPreference: vi.fn(),
      getAllPreferences: vi.fn(),
    } as unknown as TeamNotificationPreferenceRepository;

    service = new NotificationPreferenceService({
      userNotificationPreferenceRepository: mockUserRepo,
      teamNotificationPreferenceRepository: mockTeamRepo,
    });
  });

  describe("isNotificationEnabled", () => {
    test("should return true by default when no preferences exist", async () => {
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue(null);

      const result = await service.isNotificationEnabled({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(true);
    });

    test("should use user preference when only userId provided", async () => {
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue({
        emailEnabled: true,
        smsEnabled: false,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(true);
      expect(mockUserRepo.getPreference).toHaveBeenCalledWith(1, "BOOKING_CONFIRMED");
    });

    test("should return false when user preference disables channel", async () => {
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue({
        emailEnabled: false,
        smsEnabled: true,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(false);
    });

    test("should use team preference when teamId provided and preference exists", async () => {
      vi.mocked(mockTeamRepo.getPreference).mockResolvedValue({
        emailEnabled: true,
        smsEnabled: false,
        locked: false,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        teamId: 10,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(true);
      expect(mockTeamRepo.getPreference).toHaveBeenCalledWith(10, "BOOKING_CONFIRMED");
      expect(mockUserRepo.getPreference).not.toHaveBeenCalled();
    });

    test("should use team preference when locked, ignoring user preference", async () => {
      vi.mocked(mockTeamRepo.getPreference).mockResolvedValue({
        emailEnabled: false,
        smsEnabled: true,
        locked: true,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        teamId: 10,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(false);
      expect(mockUserRepo.getPreference).not.toHaveBeenCalled();
    });

    test("should fallback to user preference when team preference does not exist", async () => {
      vi.mocked(mockTeamRepo.getPreference).mockResolvedValue(null);
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue({
        emailEnabled: true,
        smsEnabled: false,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        teamId: 10,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.EMAIL,
      });

      expect(result).toBe(true);
      expect(mockUserRepo.getPreference).toHaveBeenCalledWith(1, "BOOKING_CONFIRMED");
    });

    test("should check SMS channel correctly", async () => {
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue({
        emailEnabled: false,
        smsEnabled: true,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.SMS,
      });

      expect(result).toBe(true);
    });

    test("should return false when SMS is disabled", async () => {
      vi.mocked(mockUserRepo.getPreference).mockResolvedValue({
        emailEnabled: true,
        smsEnabled: false,
      });

      const result = await service.isNotificationEnabled({
        userId: 1,
        notificationType: "BOOKING_CONFIRMED",
        channel: NotificationChannel.SMS,
      });

      expect(result).toBe(false);
    });
  });
});
