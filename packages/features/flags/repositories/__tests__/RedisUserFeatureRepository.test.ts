import { describe, it, expect, vi, beforeEach } from "vitest";

import type { UserFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../../redis/IRedisService";
import type { FeatureId, FeatureState } from "../../config";
import { RedisUserFeatureRepository } from "../RedisUserFeatureRepository";

const createMockRedisService = (): IRedisService => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
});

describe("RedisUserFeatureRepository", () => {
  let repository: RedisUserFeatureRepository;
  let mockRedisService: IRedisService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRedisService = createMockRedisService();
    repository = new RedisUserFeatureRepository(mockRedisService);
  });

  describe("findByUserIdAndFeatureId", () => {
    it("should return cached user feature when found and valid", async () => {
      const now = new Date();
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(mockUserFeature);

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(mockRedisService.get).toHaveBeenCalledWith("features:user:1:test-feature");
      expect(result).toEqual({
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(result).toBeNull();
    });

    it("should return null when cached data is invalid", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue({ invalid: "data" });

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(result).toBeNull();
    });
  });

  describe("setByUserIdAndFeatureId", () => {
    it("should cache user feature", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      await repository.setByUserIdAndFeatureId(1, "test-feature", mockUserFeature);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:user:1:test-feature",
        mockUserFeature,
        { ttl: 5 * 60 * 1000 }
      );
    });

    it("should use custom TTL when provided", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      await repository.setByUserIdAndFeatureId(1, "test-feature", mockUserFeature, 10000);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:user:1:test-feature",
        mockUserFeature,
        { ttl: 10000 }
      );
    });
  });

  describe("findByUserIdAndFeatureIds", () => {
    it("should return cached batch data when found", async () => {
      const mockData = {
        "feature-a": "enabled",
        "feature-b": "disabled",
      } as Partial<Record<FeatureId, FeatureState>>;

      vi.mocked(mockRedisService.get).mockResolvedValue(mockData);

      const result = await repository.findByUserIdAndFeatureIds(1, ["feature-a" as FeatureId, "feature-b" as FeatureId]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:user:batch:1:feature-a,feature-b");
      expect(result).toEqual(mockData);
    });

    it("should sort feature IDs for consistent cache key", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      await repository.findByUserIdAndFeatureIds(1, ["feature-c" as FeatureId, "feature-a" as FeatureId, "feature-b" as FeatureId]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:user:batch:1:feature-a,feature-b,feature-c");
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findByUserIdAndFeatureIds(1, ["feature-a" as FeatureId]);

      expect(result).toBeNull();
    });
  });

  describe("setByUserIdAndFeatureIds", () => {
    it("should cache batch data with sorted feature IDs", async () => {
      const mockData = {
        "feature-a": "enabled",
      } as Partial<Record<FeatureId, FeatureState>>;

      await repository.setByUserIdAndFeatureIds(1, ["feature-b" as FeatureId, "feature-a" as FeatureId], mockData);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:user:batch:1:feature-a,feature-b",
        mockData,
        { ttl: 5 * 60 * 1000 }
      );
    });
  });

  describe("findAutoOptInByUserId", () => {
    it("should return cached auto opt-in value when found", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(true);

      const result = await repository.findAutoOptInByUserId(1);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:user:autoOptIn:1");
      expect(result).toBe(true);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBeNull();
    });
  });

  describe("setAutoOptInByUserId", () => {
    it("should cache auto opt-in value", async () => {
      await repository.setAutoOptInByUserId(1, true);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:user:autoOptIn:1", true, {
        ttl: 5 * 60 * 1000,
      });
    });

    it("should use custom TTL when provided", async () => {
      await repository.setAutoOptInByUserId(1, false, 10000);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:user:autoOptIn:1", false, {
        ttl: 10000,
      });
    });
  });

  describe("invalidateByUserIdAndFeatureId", () => {
    it("should delete user feature cache", async () => {
      await repository.invalidateByUserIdAndFeatureId(1, "test-feature");

      expect(mockRedisService.del).toHaveBeenCalledWith("features:user:1:test-feature");
      expect(mockRedisService.del).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidateAutoOptIn", () => {
    it("should delete auto opt-in cache", async () => {
      await repository.invalidateAutoOptIn(1);

      expect(mockRedisService.del).toHaveBeenCalledWith("features:user:autoOptIn:1");
    });
  });

  describe("custom TTL in constructor", () => {
    it("should use custom TTL from constructor", async () => {
      const customTtl = 60000;
      const customRepository = new RedisUserFeatureRepository(mockRedisService, customTtl);

      await customRepository.setAutoOptInByUserId(1, true);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:user:autoOptIn:1", true, {
        ttl: customTtl,
      });
    });
  });
});
