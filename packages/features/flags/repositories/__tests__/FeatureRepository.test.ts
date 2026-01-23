import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureRepository } from "../FeatureRepository";

interface MockPrisma {
  feature: {
    findMany: ReturnType<typeof vi.fn>;
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
    },
  };
}

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

describe("FeatureRepository", () => {
  let mockPrisma: MockPrisma;
  let repository: FeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
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
});
