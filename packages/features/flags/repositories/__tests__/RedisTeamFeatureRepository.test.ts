import { describe, it, expect, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import { FakeRedisService } from "../../../redis/FakeRedisService";
import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../../config";
import { RedisTeamFeatureRepository } from "../RedisTeamFeatureRepository";

describe("RedisTeamFeatureRepository", () => {
  let repository: RedisTeamFeatureRepository;
  let redisService: FakeRedisService;

  beforeEach(() => {
    redisService = new FakeRedisService();
    repository = new RedisTeamFeatureRepository(redisService);
  });

  describe("findEnabledByTeamId", () => {
    it("should return cached enabled features when found", async () => {
      const mockFeatures = { "feature-a": true, "feature-b": true } as TeamFeaturesMap;

      await repository.setEnabledByTeamId(1, mockFeatures);
      const result = await repository.findEnabledByTeamId(1);

      expect(result).toEqual(mockFeatures);
    });

    it("should return null when not cached", async () => {
      const result = await repository.findEnabledByTeamId(1);

      expect(result).toBeNull();
    });
  });

  describe("setEnabledByTeamId", () => {
    it("should cache enabled features for team and retrieve them", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;

      await repository.setEnabledByTeamId(1, mockFeatures);
      const result = await repository.findEnabledByTeamId(1);

      expect(result).toEqual(mockFeatures);
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
        assignedAt: now,
        updatedAt: now,
      } as TeamFeatures;

      await repository.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);
      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

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
      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("setByTeamIdAndFeatureId", () => {
    it("should cache team feature and retrieve it", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      await repository.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);
      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(result).not.toBeNull();
      expect(result?.teamId).toBe(1);
      expect(result?.featureId).toBe("test-feature");
      expect(result?.enabled).toBe(true);
    });
  });

  describe("findAutoOptInByTeamId", () => {
    it("should return cached auto opt-in value when found", async () => {
      await repository.setAutoOptInByTeamId(1, true);
      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBe(true);
    });

    it("should return null when not cached", async () => {
      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBeNull();
    });
  });

  describe("setAutoOptInByTeamId", () => {
    it("should cache auto opt-in value for team and retrieve it", async () => {
      await repository.setAutoOptInByTeamId(1, true);
      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBe(true);
    });
  });

  describe("invalidateByTeamIdAndFeatureId", () => {
    it("should delete both feature cache and enabled cache", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;
      const mockFeatures = { "test-feature": true } as TeamFeaturesMap;

      await repository.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);
      await repository.setEnabledByTeamId(1, mockFeatures);

      await repository.invalidateByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId)).toBeNull();
      expect(await repository.findEnabledByTeamId(1)).toBeNull();
    });
  });

  describe("invalidateAutoOptInByTeamId", () => {
    it("should delete auto opt-in cache for team", async () => {
      await repository.setAutoOptInByTeamId(1, true);
      await repository.invalidateAutoOptInByTeamId(1);

      expect(await repository.findAutoOptInByTeamId(1)).toBeNull();
    });
  });
});
