import { describe, it, expect, vi, beforeEach } from "vitest";

import type { UserFeatures } from "@calcom/prisma/client";

import { FakeRedisService } from "../../../redis/FakeRedisService";
import type { FeatureId } from "../../config";
import { CachedUserFeatureRepository } from "../CachedUserFeatureRepository";
import type { IPrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";
import { RedisUserFeatureRepository } from "../RedisUserFeatureRepository";

const createMockPrismaRepo = (): IPrismaUserFeatureRepository => ({
  findByUserId: vi.fn(),
  findByUserIdAndFeatureId: vi.fn(),
  findByUserIdAndFeatureIds: vi.fn(),
  checkIfUserBelongsToTeamWithFeature: vi.fn(),
  checkIfUserBelongsToTeamWithFeatureNonHierarchical: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  findAutoOptInByUserId: vi.fn(),
  updateAutoOptIn: vi.fn(),
});

describe("CachedUserFeatureRepository", () => {
  let repository: CachedUserFeatureRepository;
  let mockPrismaRepo: IPrismaUserFeatureRepository;
  let redisService: FakeRedisService;
  let redisRepo: RedisUserFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrismaRepo = createMockPrismaRepo();
    redisService = new FakeRedisService();
    redisRepo = new RedisUserFeatureRepository(redisService);
    repository = new CachedUserFeatureRepository({
      prismaRepo: mockPrismaRepo,
      redisRepo: redisRepo,
    });
  });

  describe("findByUserId", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      const mockUserFeatures = [{ userId: 1, featureId: "feature-a", enabled: true }] as UserFeatures[];
      vi.mocked(mockPrismaRepo.findByUserId).mockResolvedValue(mockUserFeatures);

      const result = await repository.findByUserId(1);

      expect(mockPrismaRepo.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUserFeatures);
    });
  });

  describe("findByUserIdAndFeatureId", () => {
    it("should return cached data when available", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      await redisRepo.setByUserIdAndFeatureId(1, "test-feature" as FeatureId, mockUserFeature);

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(mockPrismaRepo.findByUserIdAndFeatureId).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserFeature);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      vi.mocked(mockPrismaRepo.findByUserIdAndFeatureId).mockResolvedValue(mockUserFeature);

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(mockPrismaRepo.findByUserIdAndFeatureId).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toEqual(mockUserFeature);

      const cachedResult = await redisRepo.findByUserIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toEqual(mockUserFeature);
    });

    it("should not cache when not found in Prisma", async () => {
      vi.mocked(mockPrismaRepo.findByUserIdAndFeatureId).mockResolvedValue(null);

      const result = await repository.findByUserIdAndFeatureId(1, "nonexistent");

      expect(result).toBeNull();
      const cachedResult = await redisRepo.findByUserIdAndFeatureId(1, "nonexistent" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("findByUserIdAndFeatureIds", () => {
    it("should return cached data when all features are cached", async () => {
      const mockUserFeatureA = {
        userId: 1,
        featureId: "feature-a",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      const mockUserFeatureB = {
        userId: 1,
        featureId: "feature-b",
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      await redisRepo.setByUserIdAndFeatureId(1, "feature-a" as FeatureId, mockUserFeatureA);
      await redisRepo.setByUserIdAndFeatureId(1, "feature-b" as FeatureId, mockUserFeatureB);

      const result = await repository.findByUserIdAndFeatureIds(1, [
        "feature-a" as FeatureId,
        "feature-b" as FeatureId,
      ]);

      expect(mockPrismaRepo.findByUserIdAndFeatureIds).not.toHaveBeenCalled();
      expect(result).toEqual({
        "feature-a": mockUserFeatureA,
        "feature-b": mockUserFeatureB,
      });
    });

    it("should fetch from Prisma for cache misses and cache individual results", async () => {
      const mockUserFeatureA = {
        userId: 1,
        featureId: "feature-a",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      const mockUserFeatureB = {
        userId: 1,
        featureId: "feature-b",
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      await redisRepo.setByUserIdAndFeatureId(1, "feature-a" as FeatureId, mockUserFeatureA);
      vi.mocked(mockPrismaRepo.findByUserIdAndFeatureIds).mockResolvedValue([mockUserFeatureB]);

      const result = await repository.findByUserIdAndFeatureIds(1, [
        "feature-a" as FeatureId,
        "feature-b" as FeatureId,
      ]);

      expect(mockPrismaRepo.findByUserIdAndFeatureIds).toHaveBeenCalledWith(1, ["feature-b"]);
      expect(result).toEqual({
        "feature-a": mockUserFeatureA,
        "feature-b": mockUserFeatureB,
      });

      const cachedResult = await redisRepo.findByUserIdAndFeatureId(1, "feature-b" as FeatureId);
      expect(cachedResult).toEqual(mockUserFeatureB);
    });

    it("should return empty object for features not found in database", async () => {
      vi.mocked(mockPrismaRepo.findByUserIdAndFeatureIds).mockResolvedValue([]);

      const result = await repository.findByUserIdAndFeatureIds(1, ["feature-a" as FeatureId]);

      expect(result).toEqual({});
    });
  });

  describe("checkIfUserBelongsToTeamWithFeature", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      vi.mocked(mockPrismaRepo.checkIfUserBelongsToTeamWithFeature).mockResolvedValue(true);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(1, "test-feature");

      expect(mockPrismaRepo.checkIfUserBelongsToTeamWithFeature).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toBe(true);
    });
  });

  describe("checkIfUserBelongsToTeamWithFeatureNonHierarchical", () => {
    it("should delegate directly to Prisma (no caching)", async () => {
      vi.mocked(mockPrismaRepo.checkIfUserBelongsToTeamWithFeatureNonHierarchical).mockResolvedValue(false);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(1, "test-feature");

      expect(mockPrismaRepo.checkIfUserBelongsToTeamWithFeatureNonHierarchical).toHaveBeenCalledWith(1, "test-feature");
      expect(result).toBe(false);
    });
  });

  describe("upsert", () => {
    it("should upsert via Prisma and invalidate cache", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      await redisRepo.setByUserIdAndFeatureId(1, "test-feature" as FeatureId, mockUserFeature);
      vi.mocked(mockPrismaRepo.upsert).mockResolvedValue(mockUserFeature);

      const result = await repository.upsert(1, "test-feature" as FeatureId, true, "admin");

      expect(mockPrismaRepo.upsert).toHaveBeenCalledWith(1, "test-feature", true, "admin");
      expect(result).toEqual(mockUserFeature);

      const cachedResult = await redisRepo.findByUserIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete via Prisma and invalidate cache", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as UserFeatures;
      await redisRepo.setByUserIdAndFeatureId(1, "test-feature" as FeatureId, mockUserFeature);

      await repository.delete(1, "test-feature" as FeatureId);

      expect(mockPrismaRepo.delete).toHaveBeenCalledWith(1, "test-feature");
      const cachedResult = await redisRepo.findByUserIdAndFeatureId(1, "test-feature" as FeatureId);
      expect(cachedResult).toBeNull();
    });
  });

  describe("findAutoOptInByUserId", () => {
    it("should return cached data when available", async () => {
      await redisRepo.setAutoOptInByUserId(1, true);

      const result = await repository.findAutoOptInByUserId(1);

      expect(mockPrismaRepo.findAutoOptInByUserId).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should fetch from Prisma and cache when not in Redis", async () => {
      vi.mocked(mockPrismaRepo.findAutoOptInByUserId).mockResolvedValue(false);

      const result = await repository.findAutoOptInByUserId(1);

      expect(mockPrismaRepo.findAutoOptInByUserId).toHaveBeenCalledWith(1);
      expect(result).toBe(false);

      const cachedResult = await redisRepo.findAutoOptInByUserId(1);
      expect(cachedResult).toBe(false);
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update via Prisma and invalidate cache", async () => {
      await redisRepo.setAutoOptInByUserId(1, true);

      await repository.updateAutoOptIn(1, false);

      expect(mockPrismaRepo.updateAutoOptIn).toHaveBeenCalledWith(1, false);
      const cachedResult = await redisRepo.findAutoOptInByUserId(1);
      expect(cachedResult).toBeNull();
    });
  });
});
