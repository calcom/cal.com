import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import type { AppFlags, FeatureId } from "../../config";
import { CachedFeatureRepository } from "../CachedFeatureRepository";
import type { IPrismaFeatureRepository } from "../PrismaFeatureRepository";
import type { IRedisFeatureRepository } from "../RedisFeatureRepository";

const createMockPrismaRepo = (): IPrismaFeatureRepository => ({
  findAll: vi.fn(),
  findBySlug: vi.fn(),
  checkIfEnabledGlobally: vi.fn(),
  getFeatureFlagMap: vi.fn(),
});

const createMockRedisRepo = (): IRedisFeatureRepository => ({
  findAll: vi.fn(),
  setAll: vi.fn(),
  findBySlug: vi.fn(),
  setBySlug: vi.fn(),
  getFeatureFlagMap: vi.fn(),
  setFeatureFlagMap: vi.fn(),
  invalidateAll: vi.fn(),
});

describe("CachedFeatureRepository", () => {
  let repository: CachedFeatureRepository;
  let mockPrismaRepo: IPrismaFeatureRepository;
  let mockRedisRepo: IRedisFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrismaRepo = createMockPrismaRepo();
    mockRedisRepo = createMockRedisRepo();
    repository = new CachedFeatureRepository({
      prismaRepo: mockPrismaRepo,
      redisRepo: mockRedisRepo,
    });
  });

  describe("findAll", () => {
    it("should return cached features when available", async () => {
      const mockFeatures = [{ slug: "feature-a", enabled: true }] as Feature[];
      vi.mocked(mockRedisRepo.findAll).mockResolvedValue(mockFeatures);

      const result = await repository.findAll();

      expect(mockRedisRepo.findAll).toHaveBeenCalled();
      expect(mockPrismaRepo.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeatures = [{ slug: "feature-a", enabled: true }] as Feature[];
      vi.mocked(mockRedisRepo.findAll).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findAll).mockResolvedValue(mockFeatures);

      const result = await repository.findAll();

      expect(mockRedisRepo.findAll).toHaveBeenCalled();
      expect(mockPrismaRepo.findAll).toHaveBeenCalled();
      expect(mockRedisRepo.setAll).toHaveBeenCalledWith(mockFeatures);
      expect(result).toEqual(mockFeatures);
    });
  });

  describe("findBySlug", () => {
    it("should return cached feature when available", async () => {
      const mockFeature = { slug: "test-feature", enabled: true } as Feature;
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(mockRedisRepo.findBySlug).toHaveBeenCalledWith("test-feature");
      expect(mockPrismaRepo.findBySlug).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeature);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeature = { slug: "test-feature", enabled: true } as Feature;
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(mockRedisRepo.findBySlug).toHaveBeenCalledWith("test-feature");
      expect(mockPrismaRepo.findBySlug).toHaveBeenCalledWith("test-feature");
      expect(mockRedisRepo.setBySlug).toHaveBeenCalledWith("test-feature", mockFeature);
      expect(result).toEqual(mockFeature);
    });

    it("should not cache when feature not found in Prisma", async () => {
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(null);

      const result = await repository.findBySlug("nonexistent" as FeatureId);

      expect(mockRedisRepo.setBySlug).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("checkIfEnabledGlobally", () => {
    it("should return true when feature exists and is enabled", async () => {
      const mockFeature = { slug: "test-feature", enabled: true } as Feature;
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(true);
    });

    it("should return false when feature exists but is disabled", async () => {
      const mockFeature = { slug: "test-feature", enabled: false } as Feature;
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(false);
    });

    it("should return false when feature does not exist", async () => {
      vi.mocked(mockRedisRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findBySlug).mockResolvedValue(null);

      const result = await repository.checkIfEnabledGlobally("nonexistent" as FeatureId);

      expect(result).toBe(false);
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return cached flag map when available", async () => {
      const mockFlagMap = { "feature-a": true, "feature-b": false } as AppFlags;
      vi.mocked(mockRedisRepo.getFeatureFlagMap).mockResolvedValue(mockFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(mockRedisRepo.getFeatureFlagMap).toHaveBeenCalled();
      expect(mockPrismaRepo.getFeatureFlagMap).not.toHaveBeenCalled();
      expect(result).toEqual(mockFlagMap);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFlagMap = { "feature-a": true } as AppFlags;
      vi.mocked(mockRedisRepo.getFeatureFlagMap).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.getFeatureFlagMap).mockResolvedValue(mockFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(mockRedisRepo.getFeatureFlagMap).toHaveBeenCalled();
      expect(mockPrismaRepo.getFeatureFlagMap).toHaveBeenCalled();
      expect(mockRedisRepo.setFeatureFlagMap).toHaveBeenCalledWith(mockFlagMap);
      expect(result).toEqual(mockFlagMap);
    });
  });
});
