import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IRedisService } from "../../../cache/decorators/types";
import { setRedisService } from "../../../cache/decorators/types";
import { FeatureRepository } from "../FeatureRepository";

interface MockPrisma {
  feature: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockRedis(): IRedisService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };
}

function createMockPrisma(): MockPrisma {
  return {
    feature: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

describe("FeatureRepository", () => {
  let mockRedis: IRedisService;
  let mockPrisma: MockPrisma;
  let repository: FeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
    setRedisService(mockRedis);
    repository = new FeatureRepository(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return cached features on cache hit", async () => {
      const cachedFeatures = [
        {
          slug: "feature-1",
          enabled: true,
          description: "Test feature",
          type: "RELEASE",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ];
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeatures);

      const result = await repository.findAll();

      expect(result).toEqual(cachedFeatures);
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:all");
      expect(mockPrisma.feature.findMany).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFeatures = [
        {
          slug: "feature-1",
          enabled: true,
          description: "Test feature",
          type: "RELEASE",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          updatedBy: null,
        },
      ];
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findMany).mockResolvedValue(dbFeatures);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findAll();

      expect(result).toEqual(dbFeatures);
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:all");
      expect(mockPrisma.feature.findMany).toHaveBeenCalledWith({
        orderBy: { slug: "asc" },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe("findBySlug", () => {
    it("should return cached feature on cache hit", async () => {
      const cachedFeature = {
        slug: "feature-1",
        enabled: true,
        description: "Test feature",
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.findBySlug("feature-1");

      expect(result).toEqual(cachedFeature);
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:feature-1");
      expect(mockPrisma.feature.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFeature = {
        slug: "feature-1",
        enabled: true,
        description: "Test feature",
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findUnique).mockResolvedValue(dbFeature);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findBySlug("feature-1");

      expect(result).toEqual(dbFeature);
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:feature-1");
      expect(mockPrisma.feature.findUnique).toHaveBeenCalledWith({
        where: { slug: "feature-1" },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return null when feature not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findUnique).mockResolvedValue(null);

      const result = await repository.findBySlug("non-existent");

      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("checkIfEnabledGlobally", () => {
    it("should return true when feature is enabled", async () => {
      const cachedFeature = {
        slug: "feature-1",
        enabled: true,
        description: "Test feature",
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.checkIfEnabledGlobally("feature-1");

      expect(result).toBe(true);
    });

    it("should return false when feature is disabled", async () => {
      const cachedFeature = {
        slug: "feature-1",
        enabled: false,
        description: "Test feature",
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: null,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.checkIfEnabledGlobally("feature-1");

      expect(result).toBe(false);
    });

    it("should return false when feature not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findUnique).mockResolvedValue(null);

      const result = await repository.checkIfEnabledGlobally("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return cached flag map on cache hit", async () => {
      const cachedFlagMap = {
        "feature-1": true,
        "feature-2": false,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFlagMap);

      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual(cachedFlagMap);
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:flagMap");
      expect(mockPrisma.feature.findMany).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFlags = [
        { slug: "feature-1", enabled: true },
        { slug: "feature-2", enabled: false },
      ];
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findMany).mockResolvedValue(dbFlags);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual({
        "feature-1": true,
        "feature-2": false,
      });
      expect(mockPrisma.feature.findMany).toHaveBeenCalledWith({
        orderBy: { slug: "asc" },
        select: { slug: true, enabled: true },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });
});
