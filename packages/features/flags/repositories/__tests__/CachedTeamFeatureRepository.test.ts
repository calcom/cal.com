import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import { FakeRedisService } from "../../../redis/FakeRedisService";
import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../../config";
import { CachedTeamFeatureRepository } from "../CachedTeamFeatureRepository";
import type { IPrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";
import { RedisTeamFeatureRepository } from "../RedisTeamFeatureRepository";

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

describe("CachedTeamFeatureRepository", () => {
  let repository: CachedTeamFeatureRepository;
  let mockPrismaRepo: IPrismaTeamFeatureRepository;
  let redisService: FakeRedisService;
  let redisRepo: RedisTeamFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrismaRepo = createMockPrismaRepo();
    redisService = new FakeRedisService();
    redisRepo = new RedisTeamFeatureRepository(redisService);
    repository = new CachedTeamFeatureRepository({
      prismaRepo: mockPrismaRepo,
      redisRepo: redisRepo,
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
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      await redisRepo.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.findByTeamIdAndFeatureId).not.toHaveBeenCalled();
      expect(result).toEqual(mockTeamFeature);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      vi.mocked(mockPrismaRepo.findByTeamIdAndFeatureId).mockResolvedValue(mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.findByTeamIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toEqual(mockTeamFeature);

      const cachedResult = await redisRepo.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toEqual(mockTeamFeature);
    });

    it("should not cache when not found in Prisma", async () => {
      vi.mocked(mockPrismaRepo.findByTeamIdAndFeatureId).mockResolvedValue(null);

      const result = await repository.findByTeamIdAndFeatureId(1, "nonexistent" as FeatureId);

      expect(result).toBeNull();
      const cachedResult = await redisRepo.findByTeamIdAndFeatureId(1, "nonexistent" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("findEnabledByTeamId", () => {
    it("should return cached data when available", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;
      await redisRepo.setEnabledByTeamId(1, mockFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(mockPrismaRepo.findEnabledByTeamId).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockFeatures = { "feature-a": true } as TeamFeaturesMap;
      vi.mocked(mockPrismaRepo.findEnabledByTeamId).mockResolvedValue(mockFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(mockPrismaRepo.findEnabledByTeamId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFeatures);

      const cachedResult = await redisRepo.findEnabledByTeamId(1);
      expect(cachedResult).toEqual(mockFeatures);
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
      const mockTeamFeatureA = {
        teamId: 1,
        featureId: "feature-a",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      await redisRepo.setByTeamIdAndFeatureId(1, "feature-a" as FeatureId, mockTeamFeatureA);

      const result = await repository.findByTeamIdsAndFeatureIds([1], ["feature-a" as FeatureId]);

      expect(mockPrismaRepo.findByTeamIdsAndFeatureIds).not.toHaveBeenCalled();
      expect(result).toEqual({ "feature-a": { 1: mockTeamFeatureA } });
    });

    it("should fetch from Prisma for cache misses and cache individual results", async () => {
      const mockTeamFeatureA = {
        teamId: 1,
        featureId: "feature-a",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      const mockTeamFeatureB = {
        teamId: 1,
        featureId: "feature-b",
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      await redisRepo.setByTeamIdAndFeatureId(1, "feature-a" as FeatureId, mockTeamFeatureA);
      vi.mocked(mockPrismaRepo.findByTeamIdsAndFeatureIds).mockResolvedValue([mockTeamFeatureB]);

      const result = await repository.findByTeamIdsAndFeatureIds([1], [
        "feature-a" as FeatureId,
        "feature-b" as FeatureId,
      ]);

      expect(mockPrismaRepo.findByTeamIdsAndFeatureIds).toHaveBeenCalledWith([1], ["feature-b"]);
      expect(result).toEqual({
        "feature-a": { 1: mockTeamFeatureA },
        "feature-b": { 1: mockTeamFeatureB },
      });

      const cachedResult = await redisRepo.findByTeamIdAndFeatureId(1, "feature-b" as FeatureId);
      expect(cachedResult).toEqual(mockTeamFeatureB);
    });

    it("should return empty object for features not found in database", async () => {
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
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      await redisRepo.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);
      vi.mocked(mockPrismaRepo.upsert).mockResolvedValue(mockTeamFeature);

      const result = await repository.upsert(1, "test-feature" as FeatureId, true, "admin");

      expect(mockPrismaRepo.upsert).toHaveBeenCalledWith(1, "test-feature", true, "admin");
      expect(result).toEqual(mockTeamFeature);

      const cachedResult = await redisRepo.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete via Prisma and invalidate cache", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as TeamFeatures;
      await redisRepo.setByTeamIdAndFeatureId(1, "test-feature" as FeatureId, mockTeamFeature);

      await repository.delete(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.delete).toHaveBeenCalledWith(1, "test-feature");
      const cachedResult = await redisRepo.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("findAutoOptInByTeamIds", () => {
    it("should return cached data when all teams are cached", async () => {
      await redisRepo.setAutoOptInByTeamId(1, true);
      await redisRepo.setAutoOptInByTeamId(2, false);

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(mockPrismaRepo.findAutoOptInByTeamIds).not.toHaveBeenCalled();
      expect(result).toEqual({ 1: true, 2: false });
    });

    it("should fetch from Prisma for cache misses and cache individual results", async () => {
      await redisRepo.setAutoOptInByTeamId(1, true);
      vi.mocked(mockPrismaRepo.findAutoOptInByTeamIds).mockResolvedValue({ 2: false });

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(mockPrismaRepo.findAutoOptInByTeamIds).toHaveBeenCalledWith([2]);
      expect(result).toEqual({ 1: true, 2: false });

      const cachedResult = await redisRepo.findAutoOptInByTeamId(2);
      expect(cachedResult).toBe(false);
    });

    it("should default to false for teams not found in database", async () => {
      vi.mocked(mockPrismaRepo.findAutoOptInByTeamIds).mockResolvedValue({});

      const result = await repository.findAutoOptInByTeamIds([1]);

      expect(result).toEqual({ 1: false });
      const cachedResult = await redisRepo.findAutoOptInByTeamId(1);
      expect(cachedResult).toBe(false);
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update via Prisma and invalidate cache", async () => {
      await redisRepo.setAutoOptInByTeamId(1, true);

      await repository.updateAutoOptIn(1, false);

      expect(mockPrismaRepo.updateAutoOptIn).toHaveBeenCalledWith(1, false);
      const cachedResult = await redisRepo.findAutoOptInByTeamId(1);
      expect(cachedResult).toBeNull();
    });
  });
});
