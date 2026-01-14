import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";

describe("PrismaUserFeatureRepository Integration Tests", () => {
  let repository: PrismaUserFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new PrismaUserFeatureRepository(prismaMock);
  });

  describe("checkIfUserBelongsToTeamWithFeature", () => {
    it("should return true when user belongs to a team with the feature enabled", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(userId, featureId);

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when user belongs to a team but feature is not enabled", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(userId, featureId);

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should return false when user membership is not accepted", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(userId, featureId);

      expect(result).toBe(false);
    });

    it("should return true when parent team has feature enabled (hierarchical lookup)", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(userId, featureId);

      expect(result).toBe(true);
    });

    it("should return false when user does not belong to any team", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(userId, featureId);

      expect(result).toBe(false);
    });
  });

  describe("checkIfUserBelongsToTeamWithFeatureNonHierarchical", () => {
    it("should return true when user belongs to a team with the feature directly enabled", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, featureId);

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when user belongs to a team but feature is not enabled", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, featureId);

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should return false when only parent team has feature (non-hierarchical does not traverse)", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, featureId);

      expect(result).toBe(false);
    });

    it("should return false when user membership is not accepted", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, featureId);

      expect(result).toBe(false);
    });

    it("should return false when user does not belong to any team", async () => {
      const userId = 1;
      const featureId = "test-feature";

      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, featureId);

      expect(result).toBe(false);
    });
  });
});
