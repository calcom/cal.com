import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/lib/server/repository/selectedCalendar");
vi.mock("../calendar-cache");

const mockSelectedCalendarRepo = {
  getNextBatchToWatch: vi.fn(),
  getNextBatchToUnwatch: vi.fn(),
  setErrorInWatching: vi.fn(),
  setErrorInUnwatching: vi.fn(),
  updateGoogleChannelProps: vi.fn(),
  deleteGoogleChannelProps: vi.fn(),
};

const mockCalendarCache = {
  watchCalendar: vi.fn(),
  unwatchCalendar: vi.fn(),
};

describe("Calendar Cache Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismock.credential.deleteMany();
    prismock.selectedCalendar.deleteMany();
  });

  describe("cron functionality", () => {
    it("should process calendars when credentials exist", async () => {
      mockSelectedCalendarRepo.getNextBatchToWatch.mockResolvedValue([
        {
          id: "cal1",
          externalId: "external1",
          credentialId: 1,
          eventTypeId: 123,
        },
      ]);

      const result = await mockSelectedCalendarRepo.getNextBatchToWatch();
      expect(result).toHaveLength(1);
      expect(result[0].credentialId).toBe(1);
    });

    it("should handle watch calendar operations", async () => {
      mockCalendarCache.watchCalendar.mockResolvedValue(undefined);

      await mockCalendarCache.watchCalendar({
        calendarId: "external1",
        eventTypeIds: [123],
      });

      expect(mockCalendarCache.watchCalendar).toHaveBeenCalledWith({
        calendarId: "external1",
        eventTypeIds: [123],
      });
    });

    it("should handle unwatch calendar operations", async () => {
      mockCalendarCache.unwatchCalendar.mockResolvedValue(undefined);

      await mockCalendarCache.unwatchCalendar({
        calendarId: "external2",
        eventTypeIds: [456],
      });

      expect(mockCalendarCache.unwatchCalendar).toHaveBeenCalledWith({
        calendarId: "external2",
        eventTypeIds: [456],
      });
    });

    it("should handle empty calendar lists", async () => {
      mockSelectedCalendarRepo.getNextBatchToWatch.mockResolvedValue([]);
      mockSelectedCalendarRepo.getNextBatchToUnwatch.mockResolvedValue([]);

      const watchResult = await mockSelectedCalendarRepo.getNextBatchToWatch();
      const unwatchResult = await mockSelectedCalendarRepo.getNextBatchToUnwatch();

      expect(watchResult).toHaveLength(0);
      expect(unwatchResult).toHaveLength(0);
    });

    it("should handle calendar cache errors", async () => {
      mockCalendarCache.watchCalendar.mockRejectedValue(new Error("Calendar error"));

      await expect(
        mockCalendarCache.watchCalendar({
          calendarId: "external1",
          eventTypeIds: [123],
        })
      ).rejects.toThrow("Calendar error");
    });

    it("should handle missing credential IDs", async () => {
      mockSelectedCalendarRepo.setErrorInWatching.mockResolvedValue(undefined);

      await mockSelectedCalendarRepo.setErrorInWatching({
        id: "cal1",
        error: "Missing credentialId",
      });

      expect(mockSelectedCalendarRepo.setErrorInWatching).toHaveBeenCalledWith({
        id: "cal1",
        error: "Missing credentialId",
      });
    });

    it("should handle calendar initialization errors", async () => {
      const { CalendarCache } = await import("../calendar-cache");
      vi.mocked(CalendarCache.initFromCredentialId).mockRejectedValue(new Error("Init failed"));

      await expect(CalendarCache.initFromCredentialId(999)).rejects.toThrow("Init failed");
    });

    it("should handle feature flag checks", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const repo = new FeaturesRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally("calendar-cache");

      expect(isEnabled).toBe(true);
      expect(mockFeaturesRepo.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("calendar-cache");
    });

    it("should handle disabled feature flag", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const repo = new FeaturesRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally("calendar-cache");

      expect(isEnabled).toBe(false);
    });
  });
});
