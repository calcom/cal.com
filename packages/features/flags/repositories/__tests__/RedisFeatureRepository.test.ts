import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import type { IRedisService } from "../../../redis/IRedisService";
import type { AppFlags, FeatureId } from "../../config";
import { RedisFeatureRepository } from "../RedisFeatureRepository";

const createMockRedisService = (): IRedisService => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
});

describe("RedisFeatureRepository", () => {
  let repository: RedisFeatureRepository;
  let mockRedisService: IRedisService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRedisService = createMockRedisService();
    repository = new RedisFeatureRepository(mockRedisService);
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

      vi.mocked(mockRedisService.get).mockResolvedValue(mockFeatures);

      const result = await repository.findAll();

      expect(mockRedisService.get).toHaveBeenCalledWith("features:global:all");
      expect(result).toEqual(mockFeatures);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findAll();

      expect(result).toBeNull();
    });
  });

  describe("setAll", () => {
    it("should cache features with default TTL", async () => {
      const mockFeatures = [{ slug: "feature-a", enabled: true }] as Feature[];

      await repository.setAll(mockFeatures);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:global:all", mockFeatures, {
        ttl: 5 * 60 * 1000,
      });
    });

    it("should cache features with custom TTL", async () => {
      const mockFeatures = [{ slug: "feature-a", enabled: true }] as Feature[];

      await repository.setAll(mockFeatures, 10000);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:global:all", mockFeatures, {
        ttl: 10000,
      });
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

      vi.mocked(mockRedisService.get).mockResolvedValue(mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(mockRedisService.get).toHaveBeenCalledWith("features:global:slug:test-feature");
      expect(result).toEqual(mockFeature);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("setBySlug", () => {
    it("should cache feature by slug", async () => {
      const mockFeature = { slug: "test-feature", enabled: true } as Feature;

      await repository.setBySlug("test-feature" as FeatureId, mockFeature);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "features:global:slug:test-feature",
        mockFeature,
        { ttl: 5 * 60 * 1000 }
      );
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return cached flag map when found", async () => {
      const mockFlagMap = { "feature-a": true, "feature-b": false } as AppFlags;

      vi.mocked(mockRedisService.get).mockResolvedValue(mockFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(mockRedisService.get).toHaveBeenCalledWith("features:global:flagMap");
      expect(result).toEqual(mockFlagMap);
    });

    it("should return null when not cached", async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);

      const result = await repository.getFeatureFlagMap();

      expect(result).toBeNull();
    });
  });

  describe("setFeatureFlagMap", () => {
    it("should cache flag map", async () => {
      const mockFlagMap = { "feature-a": true } as AppFlags;

      await repository.setFeatureFlagMap(mockFlagMap);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:global:flagMap", mockFlagMap, {
        ttl: 5 * 60 * 1000,
      });
    });
  });

  describe("custom TTL in constructor", () => {
    it("should use custom TTL from constructor", async () => {
      const customTtl = 60000;
      const customRepository = new RedisFeatureRepository(mockRedisService, customTtl);
      const mockFeatures = [{ slug: "feature-a", enabled: true }] as Feature[];

      await customRepository.setAll(mockFeatures);

      expect(mockRedisService.set).toHaveBeenCalledWith("features:global:all", mockFeatures, {
        ttl: customTtl,
      });
    });
  });
});
