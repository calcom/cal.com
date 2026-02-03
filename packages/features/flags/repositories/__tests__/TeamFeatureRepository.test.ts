import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedTeamFeatureRepository } from "../CachedTeamFeatureRepository";
import { PrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";

interface MockPrisma {
  teamFeatures: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  team: {
    findUnique: ReturnType<typeof vi.fn>;
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
    teamFeatures: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

let mockRedis: IRedisService;

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => mockRedis,
}));

describe("CachedTeamFeatureRepository", () => {
  let mockPrisma: MockPrisma;
  let prismaRepository: PrismaTeamFeatureRepository;
  let repository: CachedTeamFeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
    prismaRepository = new PrismaTeamFeatureRepository(mockPrisma as unknown as PrismaClient);
    repository = new CachedTeamFeatureRepository(prismaRepository);
    vi.clearAllMocks();
  });

  describe("findByTeamIdAndFeatureId", () => {
    it("should return cached team feature on cache hit", async () => {
      const cachedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "feature-1");

      expect(result).toEqual(cachedFeature);
      expect(mockRedis.get).toHaveBeenCalledWith("features:team:1:feature-1");
      expect(mockPrisma.teamFeatures.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findUnique).mockResolvedValue(dbFeature);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findByTeamIdAndFeatureId(1, "feature-1");

      expect(result).toEqual(dbFeature);
      expect(mockPrisma.teamFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: 1,
            featureId: "feature-1",
          },
        },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return null when team feature not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findUnique).mockResolvedValue(null);

      const result = await repository.findByTeamIdAndFeatureId(1, "non-existent");

      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("findByTeamIdsAndFeatureIds", () => {
    it("should return empty object when teamIds is empty", async () => {
      const result = await repository.findByTeamIdsAndFeatureIds([], ["feature-1"]);

      expect(result).toEqual({});
    });

    it("should return empty object when featureIds is empty", async () => {
      const result = await repository.findByTeamIdsAndFeatureIds([1, 2], []);

      expect(result).toEqual({});
    });

    it("should return features grouped by featureId and teamId", async () => {
      const dbFeature1 = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      const dbFeature2 = {
        teamId: 2,
        featureId: "feature-1",
        enabled: false,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(mockPrisma.teamFeatures.findUnique)
        .mockResolvedValueOnce(dbFeature1)
        .mockResolvedValueOnce(dbFeature2);

      const result = await repository.findByTeamIdsAndFeatureIds([1, 2], ["feature-1"]);

      expect(result).toEqual({
        "feature-1": {
          1: dbFeature1,
          2: dbFeature2,
        },
      });
    });
  });

  describe("upsert", () => {
    it("should upsert team feature and invalidate cache", async () => {
      const upsertedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockPrisma.teamFeatures.upsert).mockResolvedValue(upsertedFeature);
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      const result = await repository.upsert(1, "feature-1", true, "admin");

      expect(result).toEqual(upsertedFeature);
      expect(mockPrisma.teamFeatures.upsert).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: 1,
            featureId: "feature-1",
          },
        },
        create: {
          teamId: 1,
          featureId: "feature-1",
          enabled: true,
          assignedBy: "admin",
        },
        update: {
          enabled: true,
          assignedBy: "admin",
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:team:1:feature-1");
    });
  });

  describe("delete", () => {
    it("should delete team feature and invalidate cache", async () => {
      vi.mocked(mockPrisma.teamFeatures.delete).mockResolvedValue({
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        updatedAt: new Date("2024-01-01"),
      });
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await repository.delete(1, "feature-1");

      expect(mockPrisma.teamFeatures.delete).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: 1,
            featureId: "feature-1",
          },
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:team:1:feature-1");
    });
  });

  describe("findAutoOptInByTeamId", () => {
    it("should return cached auto opt-in value on cache hit", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(true);

      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith("features:team:autoOptIn:1");
      expect(mockPrisma.team.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.team.findUnique).mockResolvedValue({ id: 1, autoOptInFeatures: true });
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBe(true);
      expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { autoOptInFeatures: true },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return false when team not found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.team.findUnique).mockResolvedValue(null);

      const result = await repository.findAutoOptInByTeamId(1);

      expect(result).toBe(false);
    });
  });

  describe("findAutoOptInByTeamIds", () => {
    it("should return empty object when teamIds is empty", async () => {
      const result = await repository.findAutoOptInByTeamIds([]);

      expect(result).toEqual({});
    });

    it("should return auto opt-in values for multiple teams", async () => {
      vi.mocked(mockPrisma.team.findUnique)
        .mockResolvedValueOnce({ id: 1, autoOptInFeatures: true })
        .mockResolvedValueOnce({ id: 2, autoOptInFeatures: false });

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(result).toEqual({
        1: true,
        2: false,
      });
    });
  });
});
