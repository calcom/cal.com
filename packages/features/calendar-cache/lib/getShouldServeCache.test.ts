import { afterEach, describe, expect, it, vi } from "vitest";

import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import { CacheService } from "./getShouldServeCache";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";

describe("CacheService.getShouldServeCache", () => {
  const mockFeaturesRepository: IFeaturesRepository = {
    checkIfTeamHasFeature: vi.fn(),
    checkIfFeatureIsEnabledGlobally: vi.fn(),
    checkIfUserHasFeature: vi.fn(),
  };

  const cacheService = new CacheService({ featuresRepository: mockFeaturesRepository });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when shouldServeCache is explicitly set to boolean", () => {
    it("should return true when shouldServeCache is true", async () => {
      const result = await cacheService.getShouldServeCache(true, 123);
      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should return false when shouldServeCache is false", async () => {
      const result = await cacheService.getShouldServeCache(false, 123);
      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("when shouldServeCache is undefined", () => {
    it("should return false when no teamId is provided", async () => {
      const result = await cacheService.getShouldServeCache(undefined, undefined);
      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should return false when teamId is null", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await cacheService.getShouldServeCache(undefined, null as any);
      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should return false when teamId is 0", async () => {
      const result = await cacheService.getShouldServeCache(undefined, 0);
      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should check feature repository when teamId is provided and return true if feature is enabled", async () => {
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(true);

      const result = await cacheService.getShouldServeCache(undefined, 123);

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(123, CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE);
    });

    it("should check feature repository when teamId is provided and return false if feature is disabled", async () => {
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(false);

      const result = await cacheService.getShouldServeCache(undefined, 456);

      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(456, CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE);
    });
  });

  describe("edge cases", () => {
    it("should prioritize explicit shouldServeCache over teamId check", async () => {
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(true);

      const result = await cacheService.getShouldServeCache(false, 123);

      expect(result).toBe(false);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should handle positive teamId correctly", async () => {
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(true);

      const result = await cacheService.getShouldServeCache(undefined, 999);

      expect(result).toBe(true);
      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(999, CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE);
    });
  });
});
