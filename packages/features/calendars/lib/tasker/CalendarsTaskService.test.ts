import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUserRepository, mockGetConnectedDestCals } = vi.hoisted(() => ({
  mockUserRepository: {
    findByIdWithSelectedCalendars: vi.fn(),
  },
  mockGetConnectedDestCals: vi.fn(),
}));

vi.mock("../../../users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(function () {
    return mockUserRepository;
  }),
}));

vi.mock("@calcom/features/calendars/lib/getConnectedDestinationCalendars", () => ({
  getConnectedDestinationCalendarsAndEnsureDefaultsInDb: mockGetConnectedDestCals,
}));

import { CalendarsTaskService } from "./CalendarsTaskService";

describe("CalendarsTaskService", () => {
  let service: CalendarsTaskService;
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
  const mockPrisma = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarsTaskService({
      logger: mockLogger,
      prisma: mockPrisma,
    });
  });

  describe("fn: ensureDefaultCalendars", () => {
    it("should call UserRepository to find user with selected calendars", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        selectedCalendars: [],
      });
      mockGetConnectedDestCals.mockResolvedValue({});

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockUserRepository.findByIdWithSelectedCalendars).toHaveBeenCalledWith({ userId: 1 });
    });

    it("should log error and return early when user is not found", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue(null);

      await service.ensureDefaultCalendars({ userId: 999 });

      expect(mockLogger.error).toHaveBeenCalledWith("User not found for ensureDefaultCalendars", {
        userId: 999,
      });
      expect(mockGetConnectedDestCals).not.toHaveBeenCalled();
    });

    it("should call getConnectedDestinationCalendarsAndEnsureDefaultsInDb with user data", async () => {
      const mockUser = {
        id: 1,
        email: "user@example.com",
        selectedCalendars: [
          { id: "cal-1", integration: "google_calendar", externalId: "ext-1", eventTypeId: null },
          { id: "cal-2", integration: "google_calendar", externalId: "ext-2", eventTypeId: 5 },
        ],
      };
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue(mockUser);
      mockGetConnectedDestCals.mockResolvedValue({});

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockGetConnectedDestCals).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 1,
            email: "user@example.com",
            allSelectedCalendars: mockUser.selectedCalendars,
            userLevelSelectedCalendars: [mockUser.selectedCalendars[0]], // Only the one without eventTypeId
          }),
          onboarding: true,
          eventTypeId: null,
          prisma: mockPrisma,
        })
      );
    });

    it("should filter userLevelSelectedCalendars to exclude event-type-specific ones", async () => {
      const mockUser = {
        id: 1,
        email: "user@example.com",
        selectedCalendars: [
          { id: "cal-1", integration: "google_calendar", externalId: "ext-1", eventTypeId: 3 },
          { id: "cal-2", integration: "google_calendar", externalId: "ext-2", eventTypeId: 7 },
        ],
      };
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue(mockUser);
      mockGetConnectedDestCals.mockResolvedValue({});

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockGetConnectedDestCals).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            userLevelSelectedCalendars: [], // All have eventTypeId, none are user-level
          }),
        })
      );
    });

    it("should log success when calendars are ensured successfully", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        selectedCalendars: [],
      });
      mockGetConnectedDestCals.mockResolvedValue({});

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockLogger.info).toHaveBeenCalledWith("Successfully ensured default calendars for user", {
        userId: 1,
      });
    });

    it("should catch and log error when getConnectedDestinationCalendars throws", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        selectedCalendars: [],
      });
      mockGetConnectedDestCals.mockRejectedValue(new Error("Calendar sync failed"));

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockLogger.error).toHaveBeenCalledWith("Failed to ensure default calendars for user", {
        userId: 1,
        error: "Calendar sync failed",
      });
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockResolvedValue({
        id: 1,
        email: "user@example.com",
        selectedCalendars: [],
      });
      mockGetConnectedDestCals.mockRejectedValue("string error");

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockLogger.error).toHaveBeenCalledWith("Failed to ensure default calendars for user", {
        userId: 1,
        error: "Unknown error",
      });
    });

    it("should handle UserRepository throwing an error", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockRejectedValue(new Error("DB connection lost"));

      await service.ensureDefaultCalendars({ userId: 1 });

      expect(mockLogger.error).toHaveBeenCalledWith("Failed to ensure default calendars for user", {
        userId: 1,
        error: "DB connection lost",
      });
    });

    it("should not throw even when all internal calls fail", async () => {
      mockUserRepository.findByIdWithSelectedCalendars.mockRejectedValue(new Error("fail"));

      await expect(service.ensureDefaultCalendars({ userId: 1 })).resolves.toBeUndefined();
    });
  });
});
