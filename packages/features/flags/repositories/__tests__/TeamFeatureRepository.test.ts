import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IRedisService } from "../../../cache/decorators/types";
import { setRedisService } from "../../../cache/decorators/types";
import { TeamFeatureRepository } from "../TeamFeatureRepository";

interface MockPrisma {
  teamFeatures: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  team: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $queryRaw: ReturnType<typeof vi.fn>;
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
    teamFeatures: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
}

describe("TeamFeatureRepository", () => {
  let mockRedis: IRedisService;
  let mockPrisma: MockPrisma;
  let repository: TeamFeatureRepository;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPrisma = createMockPrisma();
    setRedisService(mockRedis);
    repository = new TeamFeatureRepository(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  describe("findByTeamId", () => {
    it("should return team features from database", async () => {
      const dbFeatures = [
        {
          teamId: 1,
          featureId: "feature-1",
          enabled: true,
          assignedBy: "admin",
          assignedAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];
      vi.mocked(mockPrisma.teamFeatures.findMany).mockResolvedValue(dbFeatures);

      const result = await repository.findByTeamId(1);

      expect(result).toEqual(dbFeatures);
      expect(mockPrisma.teamFeatures.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
      });
    });
  });

  describe("findByTeamIdAndFeatureId", () => {
    it("should return cached team feature on cache hit", async () => {
      const cachedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
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
        assignedAt: new Date("2024-01-01"),
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

  describe("findEnabledByTeamId", () => {
    it("should return cached enabled features on cache hit", async () => {
      const cachedFeatures = {
        "feature-1": true,
        "feature-2": true,
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeatures);

      const result = await repository.findEnabledByTeamId(1);

      expect(result).toEqual(cachedFeatures);
      expect(mockRedis.get).toHaveBeenCalledWith("features:team:enabled:1");
      expect(mockPrisma.teamFeatures.findMany).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      const dbFeatures = [{ feature: { slug: "feature-1" } }, { feature: { slug: "feature-2" } }];
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findMany).mockResolvedValue(dbFeatures);
      vi.mocked(mockRedis.set).mockResolvedValue("OK");

      const result = await repository.findEnabledByTeamId(1);

      expect(result).toEqual({
        "feature-1": true,
        "feature-2": true,
      });
      expect(mockPrisma.teamFeatures.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          enabled: true,
        },
        select: {
          feature: {
            select: {
              slug: true,
            },
          },
        },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return null when no enabled features found", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findMany).mockResolvedValue([]);

      const result = await repository.findEnabledByTeamId(1);

      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("findByFeatureIdWhereEnabled", () => {
    it("should return team IDs with enabled feature", async () => {
      const dbRows = [{ teamId: 1 }, { teamId: 2 }, { teamId: 3 }];
      vi.mocked(mockPrisma.teamFeatures.findMany).mockResolvedValue(dbRows);

      const result = await repository.findByFeatureIdWhereEnabled("feature-1");

      expect(result).toEqual([1, 2, 3]);
      expect(mockPrisma.teamFeatures.findMany).toHaveBeenCalledWith({
        where: {
          featureId: "feature-1",
          enabled: true,
        },
        select: { teamId: true },
        orderBy: { teamId: "asc" },
      });
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
      const cachedFeature1 = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      const cachedFeature2 = {
        teamId: 2,
        featureId: "feature-1",
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedFeature1).mockResolvedValueOnce(cachedFeature2);

      const result = await repository.findByTeamIdsAndFeatureIds([1, 2], ["feature-1"]);

      expect(result).toEqual({
        "feature-1": {
          1: cachedFeature1,
          2: cachedFeature2,
        },
      });
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return true when team has feature directly", async () => {
      const cachedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.checkIfTeamHasFeature(1, "feature-1");

      expect(result).toBe(true);
    });

    it("should return false when team has feature disabled", async () => {
      const cachedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(mockRedis.get).mockResolvedValue(cachedFeature);

      const result = await repository.checkIfTeamHasFeature(1, "feature-1");

      expect(result).toBe(false);
    });

    it("should check hierarchy when team does not have feature directly", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

      const result = await repository.checkIfTeamHasFeature(1, "feature-1");

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it("should return false when feature not found in hierarchy", async () => {
      vi.mocked(mockRedis.get).mockResolvedValue(null);
      vi.mocked(mockPrisma.teamFeatures.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([]);

      const result = await repository.checkIfTeamHasFeature(1, "feature-1");

      expect(result).toBe(false);
    });
  });

  describe("upsert", () => {
    it("should upsert team feature and invalidate cache", async () => {
      const upsertedFeature = {
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
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
      expect(mockRedis.del).toHaveBeenCalledWith("features:team:enabled:1");
    });
  });

  describe("delete", () => {
    it("should delete team feature and invalidate cache", async () => {
      vi.mocked(mockPrisma.teamFeatures.delete).mockResolvedValue({
        teamId: 1,
        featureId: "feature-1",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date("2024-01-01"),
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
      expect(mockRedis.del).toHaveBeenCalledWith("features:team:enabled:1");
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
      vi.mocked(mockRedis.get).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(result).toEqual({
        1: true,
        2: false,
      });
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update auto opt-in and invalidate cache", async () => {
      vi.mocked(mockPrisma.team.update).mockResolvedValue({ id: 1, autoOptInFeatures: true });
      vi.mocked(mockRedis.del).mockResolvedValue(1);

      await repository.updateAutoOptIn(1, true);

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { autoOptInFeatures: true },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("features:team:autoOptIn:1");
    });
  });
});
