import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedFeatureRepository } from "../CachedFeatureRepository";
import { PrismaFeatureRepository } from "../PrismaFeatureRepository";

interface MockPrisma {
  feature: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function createMockRedis(): IRedisService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    lrange: vi.fn(),
    lpush: vi.fn(),
  };
}

function createMockPrisma(): MockPrisma {
  return {
    feature: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

describe("CachedFeatureRepository", () => {
  let mockPrisma: MockPrisma;
  let prismaRepository: PrismaFeatureRepository;
  let repository: CachedFeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
    prismaRepository = new PrismaFeatureRepository(mockPrisma as unknown as PrismaClient);
    repository = new CachedFeatureRepository(prismaRepository);
    vi.clearAllMocks();
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
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:slug:feature-1");
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
      expect(mockRedis.get).toHaveBeenCalledWith("features:global:slug:feature-1");
      expect(mockPrisma.feature.findUnique).toHaveBeenCalledWith({
        where: { slug: "feature-1" },
        select: {
          slug: true,
          enabled: true,
          description: true,
          type: true,
          stale: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          updatedBy: true,
        },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return null when feature does not exist", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findUnique).mockResolvedValue(null);

      const result = await repository.findBySlug("non-existent");

      expect(result).toBeNull();
      expect(mockPrisma.feature.findUnique).toHaveBeenCalledWith({
        where: { slug: "non-existent" },
        select: {
          slug: true,
          enabled: true,
          description: true,
          type: true,
          stale: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          updatedBy: true,
        },
      });
    });
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
        select: {
          slug: true,
          enabled: true,
          description: true,
          type: true,
          stale: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          updatedBy: true,
        },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    it("should return true when feature exists and is enabled", async () => {
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

      const result = await repository.checkIfFeatureIsEnabledGlobally("feature-1");

      expect(result).toBe(true);
    });

    it("should return false when feature exists but is disabled", async () => {
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

      const result = await repository.checkIfFeatureIsEnabledGlobally("feature-1");

      expect(result).toBe(false);
    });

    it("should return false when feature does not exist", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.feature.findUnique).mockResolvedValue(null);

      const result = await repository.checkIfFeatureIsEnabledGlobally("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    it("should update feature and invalidate cache", async () => {
      const updatedFeature = {
        slug: "feature-1",
        enabled: false,
        description: "Test feature",
        type: "RELEASE",
        stale: false,
        lastUsedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        updatedBy: 1,
      };
      vi.mocked(mockPrisma.feature.update).mockResolvedValue(updatedFeature);
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      const result = await repository.update({
        featureId: "feature-1" as "calendar-cache",
        enabled: false,
        updatedBy: 1,
      });

      expect(result).toEqual(updatedFeature);
      expect(mockPrisma.feature.update).toHaveBeenCalledWith({
        where: { slug: "feature-1" },
        data: { enabled: false, updatedBy: 1, updatedAt: expect.any(Date) },
        select: {
          slug: true,
          enabled: true,
          description: true,
          type: true,
          stale: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          updatedBy: true,
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:global:slug:feature-1");
    });
  });
});
