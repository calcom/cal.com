import { describe, it, expect, beforeEach, vi } from "vitest";

import { CacheService } from "./CacheService";
import type { CacheConfig } from "./ICacheService";
import type { IRedisService } from "./IRedisService";

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

describe("CacheService", () => {
  let cacheService: CacheService;
  const defaultConfig: CacheConfig = {
    defaultTtl: 5 * 60 * 1000,
    enableErrorCaching: true,
    keyPrefix: "test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = new CacheService(mockRedisService, defaultConfig);
  });

  describe("withCache", () => {
    it("should return cached result when cache hit", async () => {
      const cacheKey = "test-key";
      const cachedResult = { data: "cached" };

      mockRedisService.get = vi.fn().mockResolvedValue(cachedResult);

      const fetchFn = vi.fn();
      const result = await cacheService.withCache(cacheKey, fetchFn);

      expect(result).toEqual(cachedResult);
      expect(mockRedisService.get).toHaveBeenCalledWith(cacheKey);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("should call fetch function and cache result on cache miss", async () => {
      const cacheKey = "test-key";
      const fetchResult = { data: "fetched" };

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const fetchFn = vi.fn().mockResolvedValue(fetchResult);
      const result = await cacheService.withCache(cacheKey, fetchFn);

      expect(result).toEqual(fetchResult);
      expect(mockRedisService.get).toHaveBeenCalledWith(cacheKey);
      expect(fetchFn).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(cacheKey, fetchResult, {
        ttl: defaultConfig.defaultTtl,
      });
    });

    it("should use custom TTL when provided", async () => {
      const cacheKey = "test-key";
      const fetchResult = { data: "fetched" };
      const customTtl = 10 * 60 * 1000;

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const fetchFn = vi.fn().mockResolvedValue(fetchResult);
      await cacheService.withCache(cacheKey, fetchFn, customTtl);

      expect(mockRedisService.set).toHaveBeenCalledWith(cacheKey, fetchResult, {
        ttl: customTtl,
      });
    });

    it("should handle cache read errors gracefully", async () => {
      const cacheKey = "test-key";
      const fetchResult = { data: "fetched" };

      mockRedisService.get = vi.fn().mockRejectedValue(new Error("Redis connection failed"));
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const fetchFn = vi.fn().mockResolvedValue(fetchResult);
      const result = await cacheService.withCache(cacheKey, fetchFn);

      expect(result).toEqual(fetchResult);
      expect(fetchFn).toHaveBeenCalled();
    });

    it("should cache error states when enabled", async () => {
      const cacheKey = "test-key";
      const error = new Error("Service unavailable");

      mockRedisService.get = vi.fn().mockResolvedValue(null);
      mockRedisService.set = vi.fn().mockResolvedValue("OK");

      const fetchFn = vi.fn().mockRejectedValue(error);

      await expect(cacheService.withCache(cacheKey, fetchFn)).rejects.toThrow("Service unavailable");

      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `${cacheKey}:error`,
        expect.objectContaining({
          error: "Service unavailable",
          timestamp: expect.any(Number),
        }),
        { ttl: expect.any(Number) }
      );
    });
  });

  describe("buildKey", () => {
    it("should return key with prefix when configured", () => {
      const baseKey = "feature:global:test";
      const result = cacheService.buildKey(baseKey);

      expect(result).toBe("test:feature:global:test");
    });

    it("should return base key when no prefix configured", () => {
      const noPrefixService = new CacheService(mockRedisService, {});
      const baseKey = "feature:global:test";
      const result = noPrefixService.buildKey(baseKey);

      expect(result).toBe(baseKey);
    });
  });

  describe("invalidatePattern", () => {
    it("should scan and delete matching keys", async () => {
      const pattern = "feature:global:*";
      const fullPattern = "test:feature:global:*";

      mockRedisService.scan = vi
        .fn()
        .mockResolvedValueOnce(["100", ["test:feature:global:emails", "test:feature:global:teams"]])
        .mockResolvedValueOnce(["0", ["test:feature:global:webhooks"]]);
      mockRedisService.deleteMany = vi.fn().mockResolvedValue(3);

      await cacheService.invalidatePattern(pattern);

      expect(mockRedisService.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisService.scan).toHaveBeenNthCalledWith(1, "0", {
        match: fullPattern,
        count: 10,
      });
      expect(mockRedisService.scan).toHaveBeenNthCalledWith(2, "100", {
        match: fullPattern,
        count: 10,
      });
      expect(mockRedisService.deleteMany).toHaveBeenCalledWith([
        "test:feature:global:emails",
        "test:feature:global:teams",
        "test:feature:global:webhooks",
      ]);
    });

    it("should handle empty scan results", async () => {
      mockRedisService.scan = vi.fn().mockResolvedValue(["0", []]);
      mockRedisService.deleteMany = vi.fn();

      await cacheService.invalidatePattern("feature:global:*");

      expect(mockRedisService.scan).toHaveBeenCalled();
      expect(mockRedisService.deleteMany).not.toHaveBeenCalled();
    });
  });
});
