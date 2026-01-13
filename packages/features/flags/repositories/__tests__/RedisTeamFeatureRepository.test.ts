import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../../redis/IRedisService";
import type { FeatureId, FeatureState, TeamFeatures as TeamFeaturesMap } from "../../config";
import { RedisTeamFeatureRepository } from "../RedisTeamFeatureRepository";

const createMockRedisService = (): IRedisService => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
});

describe("RedisTeamFeatureRepository", () => {
  let repository: RedisTeamFeatureRepository;
  let mockRedisService: IRedisService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRedisService = createMockRedisService();
    repository = new RedisTeamFeatureRepository(mockRedisService);
  });

  describe("findEnabledByTeamId", () => {
    it("should return cached enabled features when found", async () => {
      const mockFeatures = { "feature-a": true, "feature-b": true } as TeamFeaturesMap;

      vi.mocked(mockRedisService.get).mockResolvedValue(mockFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:enabled:1");
      expect(result).toEqual(mockFeatures);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findEnabledByTeamId(1);

      expect(result).toBeNull();
    });
  });

  describe("setEnabledByTeamId", () => {
    it("should cache enabled features for team", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;

      await repository.setEnabledByTeamId(1, mockFeatures);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:team:enabled:1", mockFeatures, {
        ttl: 5 * 60 * 1000,
      });
    });
  });

  describe("findByTeamIdAndFeatureId", () => {
    it("should return cached team feature when found and valid", async () => {
      const now = new Date();
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:1:test-feature");
      expect(result).toEqual({
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(result).toBeNull();
    });

    it("should return null when cached data is invalid", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue({ invalid: "data" });

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("setByTeamIdAndFeatureId", () => {
    it("should cache team feature", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      await repository.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:team:1:test-feature",
        mockTeamFeature,
        { ttl: 5 * 60 * 1000 }
      );
    });
  });

  describe("findByTeamIdsAndFeatureIds", () => {
    it("should return cached batch data when found", async () => {
      const mockData = {
        "feature-a": { 1: "enabled", 2: "disabled" },
      } as Partial<Record<FeatureId, Record<number, FeatureState>>>;

      vi.mocked(mockRedisService.get).mockResolvedValue(mockData);

      const result = await repository.findByTeamIdsAndFeatureIds([1, 2], ["feature-a" as FeatureId]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:batch:1,2:feature-a");
      expect(result).toEqual(mockData);
    });

    it("should sort team IDs and feature IDs for consistent cache key", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      await repository.findByTeamIdsAndFeatureIds([3, 1, 2], ["feature-b" as FeatureId, "feature-a" as FeatureId]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:batch:1,2,3:feature-a,feature-b");
    });
  });

  describe("setByTeamIdsAndFeatureIds", () => {
    it("should cache batch data with sorted keys", async () => {
      const mockData = {
        "feature-a": { 1: "enabled" },
      } as Partial<Record<FeatureId, Record<number, FeatureState>>>;

      await repository.setByTeamIdsAndFeatureIds(mockData, [2, 1], ["feature-b" as FeatureId, "feature-a" as FeatureId]);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:team:batch:1,2:feature-a,feature-b",
        mockData,
        { ttl: 5 * 60 * 1000 }
      );
    });
  });

  describe("findAutoOptInByTeamIds", () => {
    it("should return cached auto opt-in data when found", async () => {
      const mockData = { 1: true, 2: false };

      vi.mocked(mockRedisService.get).mockResolvedValue(mockData);

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:autoOptIn:1,2");
      expect(result).toEqual(mockData);
    });

    it("should sort team IDs for consistent cache key", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      await repository.findAutoOptInByTeamIds([3, 1, 2]);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:autoOptIn:1,2,3");
    });
  });

  describe("setAutoOptInByTeamIds", () => {
    it("should cache auto opt-in data with sorted team IDs", async () => {
      const mockData = { 1: true, 2: false };

      await repository.setAutoOptInByTeamIds(mockData, [2, 1]);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:team:autoOptIn:1,2", mockData, {
        ttl: 5 * 60 * 1000,
      });
    });
  });

  describe("invalidateByTeamIdAndFeatureId", () => {
    it("should delete both feature cache and enabled cache", async () => {
      await repository.invalidateByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockRedisService.del).toHaveBeenCalledWith("features:team:1:test-feature");
      expect(mockRedisService.del).toHaveBeenCalledWith("features:team:enabled:1");
      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateAutoOptIn", () => {
    it("should delete auto opt-in cache with sorted team IDs", async () => {
      await repository.invalidateAutoOptIn([2, 1, 3]);

      expect(mockRedisService.del).toHaveBeenCalledWith("features:team:autoOptIn:1,2,3");
    });
  });
});
