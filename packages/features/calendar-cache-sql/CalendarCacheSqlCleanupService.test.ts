import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import { CalendarCacheSqlCleanupService } from "./CalendarCacheSqlCleanupService";
import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";

class MockCalendarEventRepository implements ICalendarEventRepository {
  upsertEvent = vi.fn();
  getEventsForAvailability = vi.fn();
  deleteEvent = vi.fn();
  bulkUpsertEvents = vi.fn();
  cleanupOldEvents = vi.fn();
}

class MockFeaturesRepository implements IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally = vi.fn();
  checkIfUserHasFeature = vi.fn();
  checkIfTeamHasFeature = vi.fn();
}

describe("CalendarCacheSqlCleanupService", () => {
  const mockEventRepo = new MockCalendarEventRepository();
  const mockFeaturesRepo = new MockFeaturesRepository(prismock);
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const dependencies = {
    eventRepo: mockEventRepo,
    featuresRepo: mockFeaturesRepo,
    logger: mockLogger,
  };

  let cleanupService: CalendarCacheSqlCleanupService;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanupService = new CalendarCacheSqlCleanupService(dependencies);
  });

  it("should run cleanup when feature flag is enabled", async () => {
    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockEventRepo.cleanupOldEvents.mockResolvedValue(undefined);

    const result = await cleanupService.runCleanup();

    expect(result).toEqual({ success: true });
    expect(mockFeaturesRepo.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-cache-sql-cleanup"
    );
    expect(mockEventRepo.cleanupOldEvents).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith("Starting calendar cache SQL cleanup");
    expect(mockLogger.info).toHaveBeenCalledWith("Calendar cache SQL cleanup completed successfully");
  });

  it("should not run cleanup when feature flag is disabled", async () => {
    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);

    const result = await cleanupService.runCleanup();

    expect(result).toEqual({ success: true });
    expect(mockFeaturesRepo.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-cache-sql-cleanup"
    );
    expect(mockEventRepo.cleanupOldEvents).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith("Calendar cache SQL cleanup not enabled globally");
  });

  it("should handle errors gracefully", async () => {
    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockEventRepo.cleanupOldEvents.mockRejectedValue(new Error("Database error"));

    const result = await cleanupService.runCleanup();

    expect(result).toEqual({ success: false, error: "Database error" });
    expect(mockLogger.error).toHaveBeenCalledWith("Calendar cache SQL cleanup failed", {
      error: "Database error",
    });
  });

  it("should handle unknown errors", async () => {
    mockFeaturesRepo.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockEventRepo.cleanupOldEvents.mockRejectedValue("Unknown error");

    const result = await cleanupService.runCleanup();

    expect(result).toEqual({ success: false, error: "Unknown error" });
    expect(mockLogger.error).toHaveBeenCalledWith("Calendar cache SQL cleanup failed", {
      error: "Unknown error",
    });
  });
});
