import { describe, expect, vi, beforeEach, test } from "vitest";
import type { PrismaClient } from "@calcom/prisma";
import { TeamNotificationPreferenceRepository } from "./TeamNotificationPreferenceRepository";

describe("TeamNotificationPreferenceRepository", () => {
  let repository: TeamNotificationPreferenceRepository;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      teamNotificationPreference: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    repository = new TeamNotificationPreferenceRepository({
      prismaClient: mockPrisma,
    });
  });

  describe("getPreference", () => {
    test("should return preference when it exists", async () => {
      const mockPreference = {
        emailEnabled: true,
        smsEnabled: false,
        locked: true,
      };

      vi.mocked(mockPrisma.teamNotificationPreference.findUnique).mockResolvedValue(
        mockPreference as never
      );

      const result = await repository.getPreference(1, "BOOKING_CONFIRMED");

      expect(result).toEqual(mockPreference);
      expect(mockPrisma.teamNotificationPreference.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_notificationType: {
            teamId: 1,
            notificationType: "BOOKING_CONFIRMED",
          },
        },
        select: {
          emailEnabled: true,
          smsEnabled: true,
          locked: true,
        },
      });
    });

    test("should return null when preference does not exist", async () => {
      vi.mocked(mockPrisma.teamNotificationPreference.findUnique).mockResolvedValue(null);

      const result = await repository.getPreference(1, "BOOKING_CONFIRMED");

      expect(result).toBeNull();
    });
  });

  describe("getAllPreferences", () => {
    test("should return all preferences for a team", async () => {
      const mockPreferences = [
        {
          emailEnabled: true,
          smsEnabled: false,
          locked: true,
          notificationType: "BOOKING_CONFIRMED",
        },
        {
          emailEnabled: false,
          smsEnabled: true,
          locked: false,
          notificationType: "BOOKING_CANCELLED",
        },
      ];

      vi.mocked(mockPrisma.teamNotificationPreference.findMany).mockResolvedValue(
        mockPreferences as never
      );

      const result = await repository.getAllPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(mockPrisma.teamNotificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
        },
        select: {
          emailEnabled: true,
          smsEnabled: true,
          locked: true,
          notificationType: true,
        },
      });
    });
  });
});

