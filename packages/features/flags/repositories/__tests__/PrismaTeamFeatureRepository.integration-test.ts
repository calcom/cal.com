import { afterEach, beforeEach, describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";

import type { FeatureId } from "../../config";
import { PrismaTeamFeatureRepository } from "../PrismaTeamFeatureRepository";

type TestData = Awaited<ReturnType<typeof createTestData>>;

async function createTestData() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const featureId = "insights" as FeatureId;

  const feature = await prisma.feature.upsert({
    where: { slug: featureId },
    update: {},
    create: {
      slug: featureId,
      enabled: true,
      description: "Test feature for integration tests",
      type: "OPERATIONAL",
    },
  });

  const parentTeam = await prisma.team.create({
    data: {
      name: `Test Parent Team ${timestamp}-${randomSuffix}`,
      slug: `test-parent-team-${timestamp}-${randomSuffix}`,
      isOrganization: true,
    },
  });

  const childTeam = await prisma.team.create({
    data: {
      name: `Test Child Team ${timestamp}-${randomSuffix}`,
      slug: `test-child-team-${timestamp}-${randomSuffix}`,
      isOrganization: false,
      parentId: parentTeam.id,
    },
  });

  const grandchildTeam = await prisma.team.create({
    data: {
      name: `Test Grandchild Team ${timestamp}-${randomSuffix}`,
      slug: `test-grandchild-team-${timestamp}-${randomSuffix}`,
      isOrganization: false,
      parentId: childTeam.id,
    },
  });

  const standaloneTeam = await prisma.team.create({
    data: {
      name: `Test Standalone Team ${timestamp}-${randomSuffix}`,
      slug: `test-standalone-team-${timestamp}-${randomSuffix}`,
      isOrganization: false,
    },
  });

  return {
    feature,
    featureId,
    parentTeam,
    childTeam,
    grandchildTeam,
    standaloneTeam,
    cleanup: async () => {
      await prisma.teamFeatures.deleteMany({
        where: {
          teamId: {
            in: [parentTeam.id, childTeam.id, grandchildTeam.id, standaloneTeam.id],
          },
        },
      });
      await prisma.team.deleteMany({
        where: { id: grandchildTeam.id },
      });
      await prisma.team.deleteMany({
        where: { id: childTeam.id },
      });
      await prisma.team.deleteMany({
        where: { id: standaloneTeam.id },
      });
      await prisma.team.deleteMany({
        where: { id: parentTeam.id },
      });
    },
  };
}

describe("PrismaTeamFeatureRepository Integration Tests", () => {
  let testData: TestData;
  let repository: PrismaTeamFeatureRepository;

  beforeEach(async () => {
    testData = await createTestData();
    repository = new PrismaTeamFeatureRepository(prisma);
  });

  afterEach(async () => {
    await testData?.cleanup();
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return true when team has feature directly enabled", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfTeamHasFeature(testData.childTeam.id, testData.featureId);

      expect(result).toBe(true);
    });

    it("should return false when team has feature directly disabled", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfTeamHasFeature(testData.childTeam.id, testData.featureId);

      expect(result).toBe(false);
    });

    it("should return true when parent team has feature enabled (hierarchical lookup)", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testData.parentTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfTeamHasFeature(testData.childTeam.id, testData.featureId);

      expect(result).toBe(true);
    });

    it("should return true when grandparent team has feature enabled (deep hierarchical lookup)", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testData.parentTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfTeamHasFeature(testData.grandchildTeam.id, testData.featureId);

      expect(result).toBe(true);
    });

    it("should return false when no team in hierarchy has feature enabled", async () => {
      const result = await repository.checkIfTeamHasFeature(testData.grandchildTeam.id, testData.featureId);

      expect(result).toBe(false);
    });

    it("should return false for standalone team without feature", async () => {
      const result = await repository.checkIfTeamHasFeature(testData.standaloneTeam.id, testData.featureId);

      expect(result).toBe(false);
    });

    it("should return true for standalone team with feature enabled", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testData.standaloneTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfTeamHasFeature(testData.standaloneTeam.id, testData.featureId);

      expect(result).toBe(true);
    });
  });
});
