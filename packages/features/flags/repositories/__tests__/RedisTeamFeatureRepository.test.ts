import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../../redis/IRedisService";
import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../../config";
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

  describe("findAutoOptInByTeamId", () => {
    it("should return cached auto opt-in value when found", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(true);

      const result = await repository.findAutoOptInByTeamId(1);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:team:autoOptIn:1");
      expect(result).toBe(true);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBeNull();
    });
  });

  describe("setAutoOptInByTeamId", () => {
    it("should cache auto opt-in value for team", async () => {
      await repository.setAutoOptInByTeamId(1, true);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:team:autoOptIn:1", true, {
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

  describe("invalidateAutoOptInByTeamId", () => {
    it("should delete auto opt-in cache for team", async () => {
      await repository.invalidateAutoOptInByTeamId(1);

      expect(mockRedisService.del).toHaveBeenCalledWith("features:team:autoOptIn:1");
    });
  });
});
