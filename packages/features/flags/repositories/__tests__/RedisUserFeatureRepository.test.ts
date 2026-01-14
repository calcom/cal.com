import { describe, it, expect, beforeEach } from "vitest";

import type { UserFeatures } from "@calcom/prisma/client";

import { InMemoryRedisService } from "../../../redis/InMemoryRedisService";
import { RedisUserFeatureRepository } from "../RedisUserFeatureRepository";

describe("RedisUserFeatureRepository", () => {
  let repository: RedisUserFeatureRepository;
  let redisService: InMemoryRedisService;

  beforeEach(() => {
    redisService = new InMemoryRedisService();
    repository = new RedisUserFeatureRepository(redisService);
  });

  describe("findByUserIdAndFeatureId", () => {
    it("should return cached user feature when found and valid", async () => {
      const now = new Date();
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: now,
        updatedAt: now,
      } as UserFeatures;

      await repository.setByUserIdAndFeatureId(1, "test-feature", mockUserFeature);
      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

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
      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(result).toBeNull();
    });
  });

  describe("setByUserIdAndFeatureId", () => {
    it("should cache user feature and retrieve it", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      await repository.setByUserIdAndFeatureId(1, "test-feature", mockUserFeature);
      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(1);
      expect(result?.featureId).toBe("test-feature");
      expect(result?.enabled).toBe(true);
    });
  });

  describe("findAutoOptInByUserId", () => {
    it("should return cached auto opt-in value when found", async () => {
      await repository.setAutoOptInByUserId(1, true);
      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(true);
    });

    it("should return null when not cached", async () => {
      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBeNull();
    });
  });

  describe("setAutoOptInByUserId", () => {
    it("should cache auto opt-in value and retrieve it", async () => {
      await repository.setAutoOptInByUserId(1, true);
      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(true);
    });

    it("should cache false value correctly", async () => {
      await repository.setAutoOptInByUserId(1, false);
      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(false);
    });
  });

  describe("invalidateByUserIdAndFeatureId", () => {
    it("should delete user feature cache", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      await repository.setByUserIdAndFeatureId(1, "test-feature", mockUserFeature);
      await repository.invalidateByUserIdAndFeatureId(1, "test-feature");

      expect(await repository.findByUserIdAndFeatureId(1, "test-feature")).toBeNull();
    });
  });

  describe("invalidateAutoOptIn", () => {
    it("should delete auto opt-in cache", async () => {
      await repository.setAutoOptInByUserId(1, true);
      await repository.invalidateAutoOptIn(1);

      expect(await repository.findAutoOptInByUserId(1)).toBeNull();
    });
  });
});
