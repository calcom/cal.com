import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TeamFeatures } from "@calcom/prisma/client";

import type { FeatureId } from "../../config";
import { PrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";

describe("PrismaTeamFeatureRepository", () => {
  let repository: PrismaTeamFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new PrismaTeamFeatureRepository(prismaMock);
  });

  describe("findByTeamId", () => {
    it("should return all team features for a team", async () => {
      const mockTeamFeatures = [
        { teamId: 1, featureId: "feature-a", enabled: true, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
        { teamId: 1, featureId: "feature-b", enabled: false, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
      ] as TeamFeatures[];

      prismaMock.teamFeatures.findMany.mockResolvedValue(mockTeamFeatures);

      const result = await repository.findByTeamId(1);

      expect(prismaMock.teamFeatures.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
      });
      expect(result).toEqual(mockTeamFeatures);
    });
  });

  describe("findByTeamIdAndFeatureId", () => {
    it("should return team feature when found", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      prismaMock.teamFeatures.findUnique.mockResolvedValue(mockTeamFeature);

      const result = await repository.findByTeamIdAndFeatureId(1, "test-feature" as FeatureId);

      expect(prismaMock.teamFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: 1,
            featureId: "test-feature",
          },
        },
      });
      expect(result).toEqual(mockTeamFeature);
    });

    it("should return null when team feature not found", async () => {
      prismaMock.teamFeatures.findUnique.mockResolvedValue(null);

      const result = await repository.findByTeamIdAndFeatureId(1, "nonexistent" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("findEnabledByTeamId", () => {
    it("should return enabled features map for a team", async () => {
      const mockResult = [
        { feature: { slug: "feature-a" } },
        { feature: { slug: "feature-b" } },
      ];

      prismaMock.teamFeatures.findMany.mockResolvedValue(mockResult as unknown as TeamFeatures[]);

      const result = await repository.findEnabledByTeamId(1);

      expect(prismaMock.teamFeatures.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual({
        "feature-a": true,
        "feature-b": true,
      });
    });

    it("should return null when no enabled features", async () => {
      prismaMock.teamFeatures.findMany.mockResolvedValue([]);

      const result = await repository.findEnabledByTeamId(1);

      expect(result).toBeNull();
    });
  });

  describe("findByFeatureIdWhereEnabled", () => {
    it("should return team IDs with enabled feature", async () => {
      const mockRows = [{ teamId: 1 }, { teamId: 2 }, { teamId: 3 }];

      prismaMock.teamFeatures.findMany.mockResolvedValue(mockRows as unknown as TeamFeatures[]);

      const result = await repository.findByFeatureIdWhereEnabled("test-feature" as FeatureId);

      expect(prismaMock.teamFeatures.findMany).toHaveBeenCalledWith({
        where: {
          featureId: "test-feature",
          enabled: true,
        },
        select: { teamId: true },
        orderBy: { teamId: "asc" },
      });
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("findByTeamIdsAndFeatureIds", () => {
    it("should return empty object when teamIds is empty", async () => {
      const result = await repository.findByTeamIdsAndFeatureIds([], ["feature-a" as FeatureId]);

      expect(result).toEqual({});
      expect(prismaMock.teamFeatures.findMany).not.toHaveBeenCalled();
    });

    it("should return empty object when featureIds is empty", async () => {
      const result = await repository.findByTeamIdsAndFeatureIds([1, 2], []);

      expect(result).toEqual({});
      expect(prismaMock.teamFeatures.findMany).not.toHaveBeenCalled();
    });

    it("should return feature states for teams", async () => {
      const mockTeamFeatures = [
        { teamId: 1, featureId: "feature-a", enabled: true },
        { teamId: 2, featureId: "feature-a", enabled: false },
        { teamId: 1, featureId: "feature-b", enabled: true },
      ];

      prismaMock.teamFeatures.findMany.mockResolvedValue(mockTeamFeatures as unknown as TeamFeatures[]);

      const result = await repository.findByTeamIdsAndFeatureIds(
        [1, 2],
        ["feature-a" as FeatureId, "feature-b" as FeatureId]
      );

      expect(prismaMock.teamFeatures.findMany).toHaveBeenCalledWith({
        where: {
          teamId: { in: [1, 2] },
          featureId: { in: ["feature-a", "feature-b"] },
        },
        select: { teamId: true, featureId: true, enabled: true },
      });
      expect(result).toEqual({
        "feature-a": { 1: "enabled", 2: "disabled" },
        "feature-b": { 1: "enabled" },
      });
    });
  });

  describe("upsert", () => {
    it("should upsert team feature", async () => {
      const mockTeamFeature = {
        teamId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as TeamFeatures;

      prismaMock.teamFeatures.upsert.mockResolvedValue(mockTeamFeature);

      const result = await repository.upsert(1, "test-feature" as FeatureId, true, "admin");

      expect(prismaMock.teamFeatures.upsert).toHaveBeenCalledWith({
        where: {
          teamId_featureId: {
            teamId: 1,
            featureId: "test-feature",
          },
        },
        create: {
          teamId: 1,
          featureId: "test-feature",
          enabled: true,
          assignedBy: "admin",
        },
        update: {
          enabled: true,
          assignedBy: "admin",
        },
      });
      expect(result).toEqual(mockTeamFeature);
    });
  });

  describe("delete", () => {
    it("should delete team feature", async () => {
      prismaMock.teamFeatures.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete(1, "test-feature" as FeatureId);

      expect(prismaMock.teamFeatures.deleteMany).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          featureId: "test-feature",
        },
      });
    });
  });

  describe("findAutoOptInByTeamIds", () => {
    it("should return empty object when teamIds is empty", async () => {
      const result = await repository.findAutoOptInByTeamIds([]);

      expect(result).toEqual({});
      expect(prismaMock.team.findMany).not.toHaveBeenCalled();
    });

    it("should return auto opt-in settings for teams", async () => {
      const mockTeams = [
        { id: 1, autoOptInFeatures: true },
        { id: 2, autoOptInFeatures: false },
      ];

      prismaMock.team.findMany.mockResolvedValue(mockTeams as unknown as ReturnType<typeof prismaMock.team.findMany>);

      const result = await repository.findAutoOptInByTeamIds([1, 2]);

      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, autoOptInFeatures: true },
      });
      expect(result).toEqual({ 1: true, 2: false });
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update auto opt-in setting for team", async () => {
      prismaMock.team.update.mockResolvedValue({} as unknown as ReturnType<typeof prismaMock.team.update>);

      await repository.updateAutoOptIn(1, true);

      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { autoOptInFeatures: true },
      });
    });
  });
});
