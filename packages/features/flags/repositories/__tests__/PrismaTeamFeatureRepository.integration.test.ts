import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import type { FeatureId } from "../../config";
import { PrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";

describe("PrismaTeamFeatureRepository Integration Tests", () => {
  let repository: PrismaTeamFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new PrismaTeamFeatureRepository(prismaMock);
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return true when team has feature directly enabled", async () => {
      const teamId = 1;
      const featureId = "test-feature" as FeatureId;

      const mockTeamFeature = {
        teamId,
        featureId,
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      prismaMock.teamFeatures.findUnique.mockResolvedValue(mockTeamFeature);

      const result = await repository.checkIfTeamHasFeature(teamId, featureId);

      expect(prismaMock.teamFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
      });
      expect(result).toBe(true);
    });

    it("should return false when team has feature directly disabled", async () => {
      const teamId = 1;
      const featureId = "test-feature" as FeatureId;

      const mockTeamFeature = {
        teamId,
        featureId,
        enabled: false,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      prismaMock.teamFeatures.findUnique.mockResolvedValue(mockTeamFeature);

      const result = await repository.checkIfTeamHasFeature(teamId, featureId);

      expect(result).toBe(false);
    });

    it("should return true when parent team has feature enabled (hierarchical lookup via $queryRaw)", async () => {
      const childTeamId = 2;
      const featureId = "test-feature" as FeatureId;

      // No direct feature assignment for child team
      prismaMock.teamFeatures.findUnique.mockResolvedValue(null);

      // Mock $queryRaw to return a result indicating parent team has feature
      prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await repository.checkIfTeamHasFeature(childTeamId, featureId);

      expect(prismaMock.teamFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: childTeamId,
            featureId,
          },
        },
      });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when no team in hierarchy has feature enabled", async () => {
      const childTeamId = 2;
      const featureId = "test-feature" as FeatureId;

      // No direct feature assignment for child team
      prismaMock.teamFeatures.findUnique.mockResolvedValue(null);

      // Mock $queryRaw to return empty result (no parent has feature)
      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfTeamHasFeature(childTeamId, featureId);

      expect(prismaMock.teamFeatures.findUnique).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should return false when team does not exist and no hierarchy match", async () => {
      const teamId = 999;
      const featureId = "test-feature" as FeatureId;

      // No direct feature assignment
      prismaMock.teamFeatures.findUnique.mockResolvedValue(null);

      // Mock $queryRaw to return empty result
      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfTeamHasFeature(teamId, featureId);

      expect(result).toBe(false);
    });
  });
});
