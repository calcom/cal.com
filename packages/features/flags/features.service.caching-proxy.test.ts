import { describe, it, expect, beforeEach, vi } from "vitest";

import type { IRedisService } from "../redis/IRedisService.d";
import type { AppFlags } from "./config";
import { FeaturesServiceCachingProxy } from "./features.service.caching-proxy";
import type { IFeaturesService } from "./features.service.interface";

// Mock the target service
const mockTargetService: IFeaturesService = {
  checkIfFeatureIsEnabledGlobally: vi.fn(),
  checkIfUserHasFeature: vi.fn(),
  checkIfTeamHasFeature: vi.fn(),
};

// Mock the Redis service
const mockRedisService: IRedisService = {
  get: vi.fn(),
  set: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  lpush: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  deleteMany: vi.fn(),
};

describe("FeaturesServiceCachingProxy", () => {
  let cachingProxy: FeaturesServiceCachingProxy;

  beforeEach(() => {
    vi.clearAllMocks();
    cachingProxy = new FeaturesServiceCachingProxy(mockTargetService, mockRedisService, {
      defaultTtl: 5 * 60 * 1000,
      enableErrorCaching: true,
      keyPrefix: "test",
    });
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    it("should return cached result when cache hit", async () => {
      const slug = "emails" as keyof AppFlags;
      const cachedResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(cachedResult);

      const result = await cachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(result).toBe(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("test:feature:global:emails");
      expect(mockTargetService.checkIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    });

    it("should call target service and cache result on cache miss", async () => {
      const slug = "emails" as keyof AppFlags;
      const serviceResult = false;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const result = await cachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(result).toBe(serviceResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("test:feature:global:emails");
      expect(mockTargetService.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(slug);
      expect(mockRedisService.set).toHaveBeenCalledWith("test:feature:global:emails", serviceResult, {
        ttl: 5 * 60 * 1000,
      });
    });

    it("should handle cache read errors gracefully", async () => {
      const slug = "emails" as keyof AppFlags;
      const serviceResult = true;

      mockRedisService.get = vi.fn().mockRejectedValue(new Error("Redis connection failed"));
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const result = await cachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(result).toBe(serviceResult);
      expect(mockTargetService.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(slug);
    });

    it("should handle cache write errors gracefully", async () => {
      const slug = "emails" as keyof AppFlags;
      const serviceResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockRejectedValue(new Error("Redis write failed"));

      const result = await cachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(result).toBe(serviceResult);
      expect(mockTargetService.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(slug);
    });
  });

  describe("checkIfUserHasFeature", () => {
    it("should return cached result when cache hit", async () => {
      const userId = 123;
      const slug = "user-feature";
      const cachedResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(cachedResult);

      const result = await cachingProxy.checkIfUserHasFeature(userId, slug);

      expect(result).toBe(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("test:feature:user:123:user-feature");
      expect(mockTargetService.checkIfUserHasFeature).not.toHaveBeenCalled();
    });

    it("should call target service and cache result on cache miss", async () => {
      const userId = 123;
      const slug = "user-feature";
      const serviceResult = false;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfUserHasFeature = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const result = await cachingProxy.checkIfUserHasFeature(userId, slug);

      expect(result).toBe(serviceResult);
      expect(mockTargetService.checkIfUserHasFeature).toHaveBeenCalledWith(userId, slug);
      expect(mockRedisService.set).toHaveBeenCalledWith("test:feature:user:123:user-feature", serviceResult, {
        ttl: 5 * 60 * 1000,
      });
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return cached result when cache hit", async () => {
      const teamId = 456;
      const slug = "webhooks" as keyof AppFlags;
      const cachedResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(cachedResult);

      const result = await cachingProxy.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith("test:feature:team:456:webhooks");
      expect(mockTargetService.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should call target service and cache result on cache miss", async () => {
      const teamId = 456;
      const slug = "webhooks" as keyof AppFlags;
      const serviceResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfTeamHasFeature = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const result = await cachingProxy.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(serviceResult);
      expect(mockTargetService.checkIfTeamHasFeature).toHaveBeenCalledWith(teamId, slug);
      expect(mockRedisService.set).toHaveBeenCalledWith("test:feature:team:456:webhooks", serviceResult, {
        ttl: 5 * 60 * 1000,
      });
    });
  });

  describe("error caching", () => {
    it("should cache error states when enabled", async () => {
      const slug = "emails" as keyof AppFlags;
      const error = new Error("Service unavailable");

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockRejectedValue(error);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      await expect(cachingProxy.checkIfFeatureIsEnabledGlobally(slug)).rejects.toThrow("Service unavailable");

      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        "test:feature:global:emails:error",
        expect.objectContaining({
          error: "Service unavailable",
          timestamp: expect.any(Number),
        }),
        { ttl: expect.any(Number) }
      );
    });
  });

  describe("custom configuration", () => {
    it("should use custom TTL when provided", async () => {
      const customCachingProxy = new FeaturesServiceCachingProxy(mockTargetService, mockRedisService, {
        defaultTtl: 10 * 60 * 1000, // 10 minutes
      });

      const slug = "emails" as keyof AppFlags;
      const serviceResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockTargetService.checkIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(serviceResult);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      await customCachingProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(mockRedisService.set).toHaveBeenCalledWith("feature:global:emails", serviceResult, {
        ttl: 10 * 60 * 1000,
      });
    });

    it("should work without key prefix", async () => {
      const noPrefixProxy = new FeaturesServiceCachingProxy(mockTargetService, mockRedisService, {});

      const slug = "emails" as keyof AppFlags;
      const cachedResult = true;

      mockRedisService.get = vi.fn().mockResolvedValue(cachedResult);

      await noPrefixProxy.checkIfFeatureIsEnabledGlobally(slug);

      expect(mockRedisService.get).toHaveBeenCalledWith("feature:global:emails");
    });
  });
});
