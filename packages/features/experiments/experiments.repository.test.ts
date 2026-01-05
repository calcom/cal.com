import type { Feature } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prismaMock from "../../../tests/libs/__mocks__/prismaMock";

import { ExperimentsRepository } from "./experiments.repository";

describe("ExperimentsRepository", () => {
  let repository: ExperimentsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ExperimentsRepository(prismaMock);
  });

  describe("getVariantForUser", () => {
    const mockExperiment: Feature = {
      slug: "test-experiment",
      type: "EXPERIMENT",
      enabled: true,
      metadata: {
        variants: [
          { name: "control", percentage: 50 },
          { name: "treatment", percentage: 50 },
        ],
        assignmentType: "DETERMINISTIC",
      },
      description: "Test experiment",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
    };

    it("should throw error if neither userId nor teamId provided", async () => {
      await expect(repository.getVariantForUser("test-experiment", {})).rejects.toThrow(
        "Must provide userId or teamId"
      );
    });

    it("should return null if experiment doesnt exist", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(null);

      const result = await repository.getVariantForUser("nonexistent-experiment", { userId: 1 });
      expect(result).toBeNull();
    });

    it("should return null if experiment is disabled", async () => {
      prismaMock.feature.findUnique.mockResolvedValue({
        ...mockExperiment,
        enabled: false,
      });

      const result = await repository.getVariantForUser("disabled-experiment", { userId: 1 });
      expect(result).toBeNull();
    });

    it("should return null if feature is not an experiment", async () => {
      prismaMock.feature.findUnique.mockResolvedValue({
        ...mockExperiment,
        type: "EXPERIMENT_ROLLOUT",
      });

      const result = await repository.getVariantForUser("regular-feature", { userId: 1 });
      expect(result).toBeNull();
    });

    it("should assign variant to new user", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(mockExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(null);
      prismaMock.experimentVariant.create.mockResolvedValue({
        id: 1,
        experimentSlug: "test-experiment",
        variant: "control",
        userId: 1,
        teamId: null,
        assignmentType: "DETERMINISTIC",
        assignedAt: new Date(),
      });

      const result = await repository.getVariantForUser("test-experiment", { userId: 1 });

      expect(result).toBeDefined();
      expect(result?.variant).toMatch(/^(control|treatment)$/);
      expect(result?.experimentSlug).toBe("test-experiment");
      expect(result?.assignmentType).toBe("DETERMINISTIC");
      expect(result?.isNewAssignment).toBe(true);

      expect(prismaMock.experimentVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          experimentSlug: "test-experiment",
          userId: 1,
          assignmentType: "DETERMINISTIC",
        }),
      });
    });

    it("should return existing assignment for returning user", async () => {
      const existingAssignment = {
        id: 1,
        experimentSlug: "test-experiment",
        variant: "treatment",
        userId: 1,
        teamId: null,
        assignmentType: "DETERMINISTIC" as const,
        assignedAt: new Date(),
      };

      prismaMock.feature.findUnique.mockResolvedValue(mockExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(existingAssignment);

      const result = await repository.getVariantForUser("test-experiment", { userId: 1 });

      expect(result?.variant).toBe("treatment");
      expect(result?.isNewAssignment).toBe(false);
      expect(prismaMock.experimentVariant.create).not.toHaveBeenCalled();
    });

    it("should assign consistent variant for same user (deterministic)", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(mockExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(null);
      prismaMock.experimentVariant.create.mockResolvedValue({
        id: 1,
        experimentSlug: "test-experiment",
        variant: "control",
        userId: 123,
        teamId: null,
        assignmentType: "DETERMINISTIC",
        assignedAt: new Date(),
      });

      const result1 = await repository.getVariantForUser("test-experiment", { userId: 123 });

      // call again with same user - should compute same variant
      vi.clearAllMocks();
      prismaMock.feature.findUnique.mockResolvedValue(mockExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(null);
      prismaMock.experimentVariant.create.mockResolvedValue({
        id: 2,
        experimentSlug: "test-experiment",
        variant: "control",
        userId: 123,
        teamId: null,
        assignmentType: "DETERMINISTIC",
        assignedAt: new Date(),
      });

      const result2 = await repository.getVariantForUser("test-experiment", { userId: 123 });

      // deterministic assignment means same variant for same user
      expect(result2?.variant).toBe(result1?.variant);
    });

    it("should handle team-based assignment", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(mockExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(null);
      prismaMock.experimentVariant.create.mockResolvedValue({
        id: 1,
        experimentSlug: "test-experiment",
        variant: "control",
        userId: null,
        teamId: 1,
        assignmentType: "DETERMINISTIC",
        assignedAt: new Date(),
      });

      const result = await repository.getVariantForUser("test-experiment", { teamId: 1 });

      expect(result).toBeDefined();
      expect(result?.variant).toMatch(/^(control|treatment)$/);
      expect(result?.isNewAssignment).toBe(true);

      expect(prismaMock.experimentVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          experimentSlug: "test-experiment",
          teamId: 1,
          assignmentType: "DETERMINISTIC",
        }),
      });
    });

    it("should handle random assignment type", async () => {
      const randomExperiment = {
        ...mockExperiment,
        metadata: {
          variants: [
            { name: "control", percentage: 50 },
            { name: "treatment", percentage: 50 },
          ],
          assignmentType: "RANDOM",
        },
      };

      prismaMock.feature.findUnique.mockResolvedValue(randomExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(null);
      prismaMock.experimentVariant.create.mockResolvedValue({
        id: 1,
        experimentSlug: "random-experiment",
        variant: "control",
        userId: 1,
        teamId: null,
        assignmentType: "RANDOM",
        assignedAt: new Date(),
      });

      const result = await repository.getVariantForUser("random-experiment", { userId: 1 });

      expect(result).toBeDefined();
      expect(result?.variant).toMatch(/^(control|treatment)$/);
      expect(result?.assignmentType).toBe("RANDOM");
    });

    it("should maintain sticky assignment even for random experiments", async () => {
      const randomExperiment = {
        ...mockExperiment,
        metadata: {
          variants: [
            { name: "control", percentage: 50 },
            { name: "treatment", percentage: 50 },
          ],
          assignmentType: "RANDOM",
        },
      };

      const existingAssignment = {
        id: 1,
        experimentSlug: "random-sticky-experiment",
        variant: "treatment",
        userId: 99,
        teamId: null,
        assignmentType: "RANDOM" as const,
        assignedAt: new Date(),
      };

      prismaMock.feature.findUnique.mockResolvedValue(randomExperiment);
      prismaMock.experimentVariant.findFirst.mockResolvedValue(existingAssignment);

      const result = await repository.getVariantForUser("random-sticky-experiment", { userId: 99 });

      // should return existing assignment, not create new one
      expect(result?.variant).toBe("treatment");
      expect(result?.isNewAssignment).toBe(false);
      expect(prismaMock.experimentVariant.create).not.toHaveBeenCalled();
    });
  });

  describe("checkIfAssignedToFeature", () => {
    it("should return false if user has no feature access", async () => {
      prismaMock.userFeatures.findFirst.mockResolvedValue(null);
      prismaMock.teamFeatures.findFirst.mockResolvedValue(null);

      const result = await repository.checkIfAssignedToFeature("test-feature", { userId: 1 });
      expect(result).toBe(false);
    });

    it("should return true if user has direct feature access", async () => {
      prismaMock.userFeatures.findFirst.mockResolvedValue({
        userId: 1,
        featureId: "test-feature",
        assignedBy: "admin",
        updatedAt: new Date(),
        enabled: true,
      });

      const result = await repository.checkIfAssignedToFeature("test-feature", { userId: 1 });
      expect(result).toBe(true);
    });

    it("should return false if user feature is disabled", async () => {
      prismaMock.userFeatures.findFirst.mockResolvedValue({
        userId: 1,
        featureId: "test-feature",
        assignedBy: "admin",
        updatedAt: new Date(),
        enabled: false,
      });
      prismaMock.teamFeatures.findFirst.mockResolvedValue(null);

      const result = await repository.checkIfAssignedToFeature("test-feature", { userId: 1 });
      expect(result).toBe(false);
    });

    it("should return true if team has feature access", async () => {
      prismaMock.teamFeatures.findUnique.mockResolvedValue({
        teamId: 1,
        featureId: "test-feature",
        assignedBy: "admin",
        updatedAt: new Date(),
        enabled: true,
      });

      const result = await repository.checkIfAssignedToFeature("test-feature", { teamId: 1 });
      expect(result).toBe(true);
    });

    it("should return false if team feature is disabled", async () => {
      prismaMock.teamFeatures.findUnique.mockResolvedValue({
        teamId: 1,
        featureId: "test-feature",
        assignedBy: "admin",
        updatedAt: new Date(),
        enabled: false,
      });

      const result = await repository.checkIfAssignedToFeature("test-feature", { teamId: 1 });
      expect(result).toBe(false);
    });

    it("should return true if user is member of team with feature access", async () => {
      prismaMock.userFeatures.findFirst.mockResolvedValue(null);
      prismaMock.teamFeatures.findFirst.mockResolvedValue({
        teamId: 1,
        featureId: "test-feature",
        assignedBy: "admin",
        updatedAt: new Date(),
        enabled: true,
      });

      const result = await repository.checkIfAssignedToFeature("test-feature", { userId: 1 });
      expect(result).toBe(true);
    });

    it("should return false if user membership is not accepted", async () => {
      prismaMock.userFeatures.findFirst.mockResolvedValue(null);
      prismaMock.teamFeatures.findFirst.mockResolvedValue(null);

      const result = await repository.checkIfAssignedToFeature("test-feature", { userId: 1 });
      expect(result).toBe(false);
    });
  });
});
