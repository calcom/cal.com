import { describe, it, expect, beforeEach, vi } from "vitest";

import type { ICacheService } from "../redis/ICacheService";
import type { AppFlags } from "./config";
import { FeaturesServiceCachingProxy } from "./features.service.caching-proxy";
import type { IFeaturesService } from "./features.service.interface";

// Mock the target service
const mockTargetService: IFeaturesService = {
  checkIfFeatureIsEnabledGlobally: vi.fn(),
  checkIfUserHasFeature: vi.fn(),
  checkIfTeamHasFeature: vi.fn(),
};

// Mock the cache service
const mockCacheService: ICacheService = {
  withCache: vi.fn(),
  invalidatePattern: vi.fn(),
  buildKey: vi.fn(),
};

describe("FeaturesServiceCachingProxy", () => {
  let cachingProxy: FeaturesServiceCachingProxy;

  beforeEach(() => {
    vi.clearAllMocks();
    cachingProxy = new FeaturesServiceCachingProxy(mockTargetService, mockCacheService);
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    it("should delegate to cache service with correct key and fetch function", async () => {
      const slug = "emails" as keyof AppFlags;
      const expectedResult = true;
      const expectedKey = "feature:global:emails";
      const builtKey = "test:feature:global:emails";

      mockCacheService.buildKey = vi.fn().mockReturnValue(builtKey);
      mockCacheService.withCache = vi.fn().mockResolvedValue(expectedResult);

      const result = await cachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(result).toBe(expectedResult);
      expect(mockCacheService.buildKey).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheService.withCache).toHaveBeenCalledWith(builtKey, expect.any(Function));

      // Test that the fetch function calls the target service
      const fetchFn = mockCacheService.withCache.mock.calls[0][1];
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(expectedResult);

      const fetchResult = await fetchFn();
      expect(fetchResult).toBe(expectedResult);
      expect(mockTargetService.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(slug);
    });
  });

  describe("checkIfUserHasFeature", () => {
    it("should delegate to cache service with correct key and fetch function", async () => {
      const userId = 123;
      const slug = "user-feature";
      const expectedResult = false;
      const expectedKey = "feature:user:123:user-feature";
      const builtKey = "test:feature:user:123:user-feature";

      mockCacheService.buildKey = vi.fn().mockReturnValue(builtKey);
      mockCacheService.withCache = vi.fn().mockResolvedValue(expectedResult);

      const result = await cachingProxy.checkIfUserHasFeature(userId, slug);

      expect(result).toBe(expectedResult);
      expect(mockCacheService.buildKey).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheService.withCache).toHaveBeenCalledWith(builtKey, expect.any(Function));

      // Test that the fetch function calls the target service
      const fetchFn = mockCacheService.withCache.mock.calls[0][1];
      mockTargetService.checkIfUserHasFeature = vi.fn().mockResolvedValue(expectedResult);

      const fetchResult = await fetchFn();
      expect(fetchResult).toBe(expectedResult);
      expect(mockTargetService.checkIfUserHasFeature).toHaveBeenCalledWith(userId, slug);
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should delegate to cache service with correct key and fetch function", async () => {
      const teamId = 456;
      const slug = "webhooks" as keyof AppFlags;
      const expectedResult = true;
      const expectedKey = "feature:team:456:webhooks";
      const builtKey = "test:feature:team:456:webhooks";

      mockCacheService.buildKey = vi.fn().mockReturnValue(builtKey);
      mockCacheService.withCache = vi.fn().mockResolvedValue(expectedResult);

      const result = await cachingProxy.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(expectedResult);
      expect(mockCacheService.buildKey).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheService.withCache).toHaveBeenCalledWith(builtKey, expect.any(Function));

      // Test that the fetch function calls the target service
      const fetchFn = mockCacheService.withCache.mock.calls[0][1];
      mockTargetService.checkIfTeamHasFeature = vi.fn().mockResolvedValue(expectedResult);

      const fetchResult = await fetchFn();
      expect(fetchResult).toBe(expectedResult);
      expect(mockTargetService.checkIfTeamHasFeature).toHaveBeenCalledWith(teamId, slug);
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate global cache pattern", async () => {
      await cachingProxy.invalidateCache("global");

      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith("feature:global:*");
    });

    it("should invalidate user cache pattern", async () => {
      await cachingProxy.invalidateCache("user", 123);

      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith("feature:user:123:*");
    });

    it("should invalidate team cache pattern", async () => {
      await cachingProxy.invalidateCache("team", 456);

      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith("feature:team:456:*");
    });

    it("should throw error when user ID is missing", async () => {
      await expect(cachingProxy.invalidateCache("user")).rejects.toThrow(
        "User ID required for user cache invalidation"
      );
    });

    it("should throw error when team ID is missing", async () => {
      await expect(cachingProxy.invalidateCache("team")).rejects.toThrow(
        "Team ID required for team cache invalidation"
      );
    });
  });
});
