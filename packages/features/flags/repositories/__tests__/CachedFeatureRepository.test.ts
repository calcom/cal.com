import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import { FakeRedisService } from "../../../redis/FakeRedisService";
import type { AppFlags, FeatureId } from "../../config";
import { CachedFeatureRepository } from "../CachedFeatureRepository";
import type { IPrismaFeatureRepository } from "../PrismaFeatureRepository";
import { RedisFeatureRepository } from "../RedisFeatureRepository";

const createMockPrismaRepo = (): IPrismaFeatureRepository => ({
  findAll: vi.fn(),
  findBySlug: vi.fn(),
  checkIfEnabledGlobally: vi.fn(),
  getFeatureFlagMap: vi.fn(),
});

describe("CachedFeatureRepository", () => {
  let repository: CachedFeatureRepository;
  let mockPrismaRepo: IPrismaFeatureRepository;
  let redisService: FakeRedisService;
  let redisRepo: RedisFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrismaRepo = createMockPrismaRepo();
    redisService = new FakeRedisService();
    redisRepo = new RedisFeatureRepository(redisService);
    repository = new CachedFeatureRepository({
      prismaRepo: mockPrismaRepo,
      redisRepo: redisRepo,
    });
  });

  describe("findAll", () => {
    it("should return cached features when available", async () => {
      const mockFeatures = [
        {
          slug: "feature-a",
          enabled: true,
          description: null,
          type: "OPERATIONAL",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ] as Feature[];
      await redisRepo.setAll(mockFeatures);

      const result = await repository.findAll();

      expect(mockPrismaRepo.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeatures = [
        {
          slug: "feature-a",
          enabled: true,
          description: null,
          type: "OPERATIONAL",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ] as Feature[];
      vi.mocked(mockPrismaRepo.findAll).mockResolvedValue(mockFeatures);

      const result = await repository.findAll();

      expect(mockPrismaRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);

      const cachedResult = await redisRepo.findAll();
      expect(cachedResult).toEqual(mockFeatures);
    });
  });

  describe("findBySlug", () => {
    it("should return cached feature when available", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        type: "OPERATIONAL",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;
      await redisRepo.setBySlug("test-feature" as FeatureId, mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(mockPrismaRepo.findBySlug).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeature);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        type: "OPERATIONAL",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(mockPrismaRepo.findBySlug).toHaveBeenCalledWith("test-feature");
      expect(result).toEqual(mockFeature);

      const cachedResult = await redisRepo.findBySlug("test-feature" as FeatureId);
      expect(cachedResult).toEqual(mockFeature);
    });

    it("should not cache when feature not found in Prisma", async () => {
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(null);

      const result = await repository.findBySlug("nonexistent" as FeatureId);

      expect(result).toBeNull();
      const cachedResult = await redisRepo.findBySlug("nonexistent" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("checkIfEnabledGlobally", () => {
    it("should return true when feature exists and is enabled", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        type: "OPERATIONAL",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;
      await redisRepo.setBySlug("test-feature" as FeatureId, mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(true);
    });

    it("should return false when feature exists but is disabled", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: false,
        description: null,
        type: "OPERATIONAL",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      } as Feature;
      await redisRepo.setBySlug("test-feature" as FeatureId, mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(false);
    });

    it("should return false when feature does not exist", async () => {
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(null);

      const result = await repository.checkIfEnabledGlobally("nonexistent" as FeatureId);

      expect(result).toBe(false);
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return cached flag map when available", async () => {
      const mockFlagMap = { "feature-a": true, "feature-b": false } as AppFlags;
      await redisRepo.setFeatureFlagMap(mockFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(mockPrismaRepo.getFeatureFlagMap).not.toHaveBeenCalled();
      expect(result).toEqual(mockFlagMap);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFlagMap = { "feature-a": true } as AppFlags;
      vi.mocked(mockPrismaRepo.getFeatureFlagMap).mockResolvedValue(mockFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(mockPrismaRepo.getFeatureFlagMap).toHaveBeenCalled();
      expect(result).toEqual(mockFlagMap);

      const cachedResult = await redisRepo.getFeatureFlagMap();
      expect(cachedResult).toEqual(mockFlagMap);
    });
  });
});
