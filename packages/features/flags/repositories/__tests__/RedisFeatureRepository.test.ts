import { describe, it, expect, beforeEach } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import { InMemoryRedisService } from "../../../redis/InMemoryRedisService";
import type { AppFlags, FeatureId } from "../../config";
import { RedisFeatureRepository } from "../RedisFeatureRepository";

describe("RedisFeatureRepository", () => {
  let repository: RedisFeatureRepository;
  let redisService: InMemoryRedisService;

  beforeEach(() => {
    redisService = new InMemoryRedisService();
    repository = new RedisFeatureRepository(redisService);
  });

  describe("findAll", () => {
    it("should return cached features when found", async () => {
      const mockFeatures = [
        {
          slug: "feature-a",
          enabled: true,
          description: null,
          type: "RELEASE",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
        {
          slug: "feature-b",
          enabled: false,
          description: null,
          type: "RELEASE",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ] as Feature[];

      await repository.setAll(mockFeatures);
      const result = await repository.findAll();

      expect(result).toEqual(mockFeatures);
    });

    it("should return null when not cached", async () => {
      const result = await repository.findAll();

      expect(result).toBeNull();
    });
  });

  describe("setAll", () => {
    it("should cache features and retrieve them", async () => {
      const mockFeatures = [
        {
          slug: "feature-a",
          enabled: true,
          description: null,
          type: "RELEASE",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ] as Feature[];

      await repository.setAll(mockFeatures);
      const result = await repository.findAll();

      expect(result).toEqual(mockFeatures);
    });
  });

  describe("findBySlug", () => {
    it("should return cached feature when found", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;

      await repository.setBySlug("test-feature" as FeatureId, mockFeature);
      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(result).toEqual(mockFeature);
    });

    it("should return null when not cached", async () => {
      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("setBySlug", () => {
    it("should cache feature by slug and retrieve it", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;

      await repository.setBySlug("test-feature" as FeatureId, mockFeature);
      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(result).toEqual(mockFeature);
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return cached flag map when found", async () => {
      const mockFlagMap = { "feature-a": true, "feature-b": false } as AppFlags;

      await repository.setFeatureFlagMap(mockFlagMap);
      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual(mockFlagMap);
    });

    it("should return null when not cached", async () => {
      const result = await repository.getFeatureFlagMap();

      expect(result).toBeNull();
    });
  });

  describe("setFeatureFlagMap", () => {
    it("should cache flag map and retrieve it", async () => {
      const mockFlagMap = { "feature-a": true } as AppFlags;

      await repository.setFeatureFlagMap(mockFlagMap);
      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual(mockFlagMap);
    });
  });

});
