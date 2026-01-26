import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedUserFeatureRepository } from "../CachedUserFeatureRepository";
import { PrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";

interface MockPrisma {
  userFeatures: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  user: {
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
    userFeatures: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

describe("CachedUserFeatureRepository", () => {
  let mockPrisma: MockPrisma;
  let prismaRepository: PrismaUserFeatureRepository;
  let repository: CachedUserFeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
    prismaRepository = new PrismaUserFeatureRepository(mockPrisma as unknown as PrismaClient);
    repository = new CachedUserFeatureRepository(prismaRepository);
    vi.clearAllMocks();
  });

  describe("findByUserIdAndFeatureId", () => {
    it("should return cached user feature on cache hit", async () => {
      const cachedFeature = {
        userId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.findByUserIdAndFeatureId(1, "feature-1");

      expect(result).toEqual(cachedFeature);
      expect(mockRedis.get).toHaveBeenCalledWith("features:user:1:feature-1");
      expect(mockPrisma.userFeatures.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFeature = {
        userId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.userFeatures.findUnique).mockResolvedValue(dbFeature);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findByUserIdAndFeatureId(1, "feature-1");

      expect(result).toEqual(dbFeature);
      expect(mockPrisma.userFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "feature-1",
          },
        },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return null when user feature not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.userFeatures.findUnique).mockResolvedValue(null);

      const result = await repository.findByUserIdAndFeatureId(1, "non-existent");

      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("findByUserIdAndFeatureIds", () => {
    it("should return empty object when featureIds is empty", async () => {
      const result = await repository.findByUserIdAndFeatureIds(1, []);

      expect(result).toEqual({});
    });

    it("should return features grouped by featureId", async () => {
      const dbFeature1 = {
        userId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      const dbFeature2 = {
        userId: 1,
        featureId: "feature-2",
        enabled: false,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(mockPrisma.userFeatures.findMany).mockResolvedValue([dbFeature1, dbFeature2]);

      const result = await repository.findByUserIdAndFeatureIds(1, ["feature-1", "feature-2"]);

      expect(result).toEqual({
        "feature-1": dbFeature1,
        "feature-2": dbFeature2,
      });
      expect(mockPrisma.userFeatures.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          featureId: {
            in: ["feature-1", "feature-2"],
          },
        },
        select: {
          userId: true,
          featureId: true,
          enabled: true,
          assignedBy: true,
          updatedAt: true,
        },
      });
    });
  });

  describe("upsert", () => {
    it("should upsert user feature and invalidate cache", async () => {
      const upsertedFeature = {
        userId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockPrisma.userFeatures.upsert).mockResolvedValue(upsertedFeature);
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      const result = await repository.upsert(1, "feature-1", true, "admin");

      expect(result).toEqual(upsertedFeature);
      expect(mockPrisma.userFeatures.upsert).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "feature-1",
          },
        },
        create: {
          userId: 1,
          featureId: "feature-1",
          enabled: true,
          assignedBy: "admin",
        },
        update: {
          enabled: true,
          assignedBy: "admin",
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:user:1:feature-1");
    });
  });

  describe("delete", () => {
    it("should delete user feature and invalidate cache", async () => {
      vi.mocked(mockPrisma.userFeatures.delete).mockResolvedValue({
        userId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      });
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await repository.delete(1, "feature-1");

      expect(mockPrisma.userFeatures.delete).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "feature-1",
          },
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:user:1:feature-1");
    });
  });

  describe("findAutoOptInByUserId", () => {
    it("should return cached auto opt-in value on cache hit", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(true);

      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith("features:user:autoOptIn:1");
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: 1, autoOptInFeatures: true });
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { autoOptInFeatures: true },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return false when user not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(false);
    });
  });

  describe("setAutoOptIn", () => {
    it("should update auto opt-in and invalidate cache", async () => {
      vi.mocked(mockPrisma.user.update).mockResolvedValue({ id: 1, autoOptInFeatures: true });
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await repository.setAutoOptIn(1, true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { autoOptInFeatures: true },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:user:autoOptIn:1");
    });
  });
});
