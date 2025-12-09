import { describe, expect, vi, beforeEach, test } from "vitest";
import type { PrismaClient } from "@calcom/prisma";
import { UserNotificationPreferenceRepository } from "./UserNotificationPreferenceRepository";

describe("UserNotificationPreferenceRepository", () => {
  let repository: UserNotificationPreferenceRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      userNotificationPreference: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    repository = new UserNotificationPreferenceRepository({
      prismaClient: mockPrisma,
    });
  });

  describe("getPreference", () => {
    test("should return preference when it exists", async () => {
      const mockPreference = {
        emailEnabled: true,
        smsEnabled: false,
      };

      vi.mocked(mockPrisma.userNotificationPreference.findUnique).mockResolvedValue(
        mockPreference as never
      );

      const result = await repository.getPreference(1, "BOOKING_CONFIRMED");

      expect(result).toEqual(mockPreference);
      expect(mockPrisma.userNotificationPreference.findUnique).toHaveBeenCalledWith({
        where: {
          userId_notificationType: {
            userId: 1,
            notificationType: "BOOKING_CONFIRMED",
          },
        },
        select: {
          emailEnabled: true,
          smsEnabled: true,
        },
      });
    });

    test("should return null when preference does not exist", async () => {
      vi.mocked(mockPrisma.userNotificationPreference.findUnique).mockResolvedValue(null);

      const result = await repository.getPreference(1, "BOOKING_CONFIRMED");

      expect(result).toBeNull();
    });
  });

  describe("getAllPreferences", () => {
    test("should return all preferences for a user", async () => {
      const mockPreferences = [
        {
          emailEnabled: true,
          smsEnabled: false,
          notificationType: "BOOKING_CONFIRMED",
        },
        {
          emailEnabled: false,
          smsEnabled: true,
          notificationType: "BOOKING_CANCELLED",
        },
      ];

      vi.mocked(mockPrisma.userNotificationPreference.findMany).mockResolvedValue(
        mockPreferences as never
      );

      const result = await repository.getAllPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(mockPrisma.userNotificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
        },
        select: {
          emailEnabled: true,
          smsEnabled: true,
          notificationType: true,
        },
      });
    });
  });
});

