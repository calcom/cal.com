import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../../config";
import { CachedTeamFeatureRepository } from "../CachedTeamFeatureRepository";
import type { IPrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";
import type { IRedisTeamFeatureRepository } from "../RedisTeamFeatureRepository";

const createMockPrismaRepo = (): IPrismaTeamFeatureRepository => ({
  findByTeamId: vi.fn(),
  findByTeamIdAndFeatureId: vi.fn(),
  findEnabledByTeamId: vi.fn(),
  findByFeatureIdWhereEnabled: vi.fn(),
  findByTeamIdsAndFeatureIds: vi.fn(),
  checkIfTeamHasFeature: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  findAutoOptInByTeamIds: vi.fn(),
  updateAutoOptIn: vi.fn(),
});

const createMockRedisRepo = (): IRedisTeamFeatureRepository => ({
  findEnabledByTeamId: vi.fn(),
  setEnabledByTeamId: vi.fn(),
  findByTeamIdAndFeatureId: vi.fn(),
  setByTeamIdAndFeatureId: vi.fn(),
  findAutoOptInByTeamId: vi.fn(),
  setAutoOptInByTeamId: vi.fn(),
  invalidateByTeamIdAndFeatureId: vi.fn(),
  invalidateAutoOptInByTeamId: vi.fn(),
});

describe("CachedTeamFeatureRepository", () => {
  let repository: CachedTeamFeatureRepository;
  let mockPrismaRepo: IPrismaTeamFeatureRepository;
  let mockRedisRepo: IRedisTeamFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrismaRepo = createMockPrismaRepo();
    mockRedisRepo = createMockRedisRepo();
    repository = new CachedTeamFeatureRepository({
      prismaRepo: mockPrismaRepo,
      redisRepo: mockRedisRepo,
    });
  });

  describe("findByTeamId", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      const mockTeamFeatures = [{ teamId: 1, featureId: "feature-a", enabled: true }] as TeamFeatures[];
      vi.mocked(mockPrismaRepo.findByTeamId).mockResolvedValue(mockTeamFeatures);

      const result = await repository.findByTeamId(1);

      expect(mockPrismaRepo.findByTeamId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTeamFeatures);
    });
  });

  describe("findByTeamIdAndFeatureId", () => {
    it("should return cached data when available", async () => {
      const mockTeamFeature = { teamId: 1, featureId: "test-feature", enabled: true } as TeamFeatures;
      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId).mockResolvedValue(mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockRedisRepo.findByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
      expect(mockPrismaRepo.findByTeamIdAndFeatureId).not.toHaveBeenCalled();
      expect(result).toEqual(mockTeamFeature);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockTeamFeature = { teamId: 1, featureId: "test-feature", enabled: true } as TeamFeatures;
      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findByTeamIdAndFeatureId).mockResolvedValue(mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.findByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
      expect(mockRedisRepo.setByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature", mockTeamFeature);
      expect(result).toEqual(mockTeamFeature);
    });

    it("should not cache when not found in Prisma", async () => {
      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findByTeamIdAndFeatureId).mockResolvedValue(null);

      const result = await repository.findByTeamIdAndFeatureId(1, "nonexistent" as FeatureId);

      expect(mockRedisRepo.setByTeamIdAndFeatureId).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("findEnabledByTeamId", () => {
    it("should return cached data when available", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;
      vi.mocked(mockRedisRepo.findEnabledByTeamId).mockResolvedValue(mockFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(mockRedisRepo.findEnabledByTeamId).toHaveBeenCalledWith(1);
      expect(mockPrismaRepo.findEnabledByTeamId).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;
      vi.mocked(mockRedisRepo.findEnabledByTeamId).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findEnabledByTeamId).mockResolvedValue(mockFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(mockPrismaRepo.findEnabledByTeamId).toHaveBeenCalledWith(1);
      expect(mockRedisRepo.setEnabledByTeamId).toHaveBeenCalledWith(1, mockFeatures);
      expect(result).toEqual(mockFeatures);
    });
  });

  describe("findByFeatureIdWhereEnabled", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      const mockTeamIds = [1, 2, 3];
      vi.mocked(mockPrismaRepo.findByFeatureIdWhereEnabled).mockResolvedValue(mockTeamIds);

      const result = await repository.findByFeatureIdWhereEnabled("test-feature" as FeatureId);

      expect(mockPrismaRepo.findByFeatureIdWhereEnabled).toHaveBeenCalledWith("test-feature");
      expect(result).toEqual(mockTeamIds);
    });
  });

  describe("findByTeamIdsAndFeatureIds", () => {
    it("should return cached data when all features are cached", async () => {
      const mockTeamFeatureA = { teamId: 1, featureId: "feature-a", enabled: true } as TeamFeatures;

      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId).mockResolvedValue(mockTeamFeatureA);

      const result = await repository.findByTeamIdsAndFeatureIds([1], ["feature-a" as FeatureId]);

      expect(mockRedisRepo.findByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "feature-a");
      expect(mockPrismaRepo.findByTeamIdsAndFeatureIds).not.toHaveBeenCalled();
      expect(result).toEqual({ "feature-a": { 1: mockTeamFeatureA } });
    });

    it("should fetch from Prisma for cache misses and cache individual results", async () => {
      const mockTeamFeatureA = { teamId: 1, featureId: "feature-a", enabled: true } as TeamFeatures;
      const mockTeamFeatureB = { teamId: 1, featureId: "feature-b", enabled: false } as TeamFeatures;

      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId)
        .mockResolvedValueOnce(mockTeamFeatureA)
        .mockResolvedValueOnce(null);

      vi.mocked(mockPrismaRepo.findByTeamIdsAndFeatureIds).mockResolvedValue([mockTeamFeatureB]);

      const result = await repository.findByTeamIdsAndFeatureIds([1], [
        "feature-a" as FeatureId,
        "feature-b" as FeatureId,
      ]);

      expect(mockRedisRepo.findByTeamIdAndFeatureId).toHaveBeenCalledTimes(2);
      expect(mockPrismaRepo.findByTeamIdsAndFeatureIds).toHaveBeenCalledWith([1], ["feature-b"]);
      expect(mockRedisRepo.setByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "feature-b", mockTeamFeatureB);
      expect(result).toEqual({
        "feature-a": { 1: mockTeamFeatureA },
        "feature-b": { 1: mockTeamFeatureB },
      });
    });

    it("should return empty object for features not found in database", async () => {
      vi.mocked(mockRedisRepo.findByTeamIdAndFeatureId).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findByTeamIdsAndFeatureIds).mockResolvedValue([]);

      const result = await repository.findByTeamIdsAndFeatureIds([1], ["feature-a" as FeatureId]);

      expect(result).toEqual({});
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      vi.mocked(mockPrismaRepo.checkIfTeamHasFeature).mockResolvedValue(true);

      const result = await repository.checkIfTeamHasFeature(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.checkIfTeamHasFeature).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toBe(true);
    });
  });

  describe("upsert", () => {
    it("should upsert via Prisma and invalidate cache", async () => {
      const mockTeamFeature = { teamId: 1, featureId: "test-feature", enabled: true } as TeamFeatures;
      vi.mocked(mockPrismaRepo.upsert).mockResolvedValue(mockTeamFeature);

      const result = await repository.upsert(1, "test-feature" as FeatureId, true, "admin");

      expect(mockPrismaRepo.upsert).toHaveBeenCalledWith(1, "test-feature", true, "admin");
      expect(mockRedisRepo.invalidateByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toEqual(mockTeamFeature);
    });
  });

  describe("delete", () => {
    it("should delete via Prisma and invalidate cache", async () => {
      await repository.delete(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.delete).toHaveBeenCalledWith(1, "test-feature");
      expect(mockRedisRepo.invalidateByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
    });
  });

  describe("findAutoOptInByTeamIds", () => {
    it("should return cached data when all teams are cached", async () => {
      vi.mocked(mockRedisRepo.findAutoOptInByTeamId)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(mockRedisRepo.findAutoOptInByTeamId).toHaveBeenCalledTimes(2);
      expect(mockPrismaRepo.findAutoOptInByTeamIds).not.toHaveBeenCalled();
      expect(result).toEqual({ 1: true, 2: false });
    });

    it("should fetch from Prisma for cache misses and cache individual results", async () => {
      vi.mocked(mockRedisRepo.findAutoOptInByTeamId)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(null);

      vi.mocked(mockPrismaRepo.findAutoOptInByTeamIds).mockResolvedValue({ 2: false });

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(mockRedisRepo.findAutoOptInByTeamId).toHaveBeenCalledTimes(2);
      expect(mockPrismaRepo.findAutoOptInByTeamIds).toHaveBeenCalledWith([2]);
      expect(mockRedisRepo.setAutoOptInByTeamId).toHaveBeenCalledWith(2, false);
      expect(result).toEqual({ 1: true, 2: false });
    });

    it("should default to false for teams not found in database", async () => {
      vi.mocked(mockRedisRepo.findAutoOptInByTeamId).mockResolvedValue(null);
      vi.mocked(mockPrismaRepo.findAutoOptInByTeamIds).mockResolvedValue({});

      const result = await repository.findAutoOptInByTeamIds([1]);

      expect(mockRedisRepo.setAutoOptInByTeamId).toHaveBeenCalledWith(1, false);
      expect(result).toEqual({ 1: false });
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update via Prisma and invalidate cache", async () => {
      await repository.updateAutoOptIn(1, true);

      expect(mockPrismaRepo.updateAutoOptIn).toHaveBeenCalledWith(1, true);
      expect(mockRedisRepo.invalidateAutoOptInByTeamId).toHaveBeenCalledWith(1);
    });
  });
});
