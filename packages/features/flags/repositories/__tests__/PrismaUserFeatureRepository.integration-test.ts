import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { PrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";

async function createTestData() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const featureId = "insights";

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

  const user = await prisma.user.create({
    data: {
      email: `test-user-${timestamp}-${randomSuffix}@example.com`,
      username: `testuser-${timestamp}-${randomSuffix}`,
      name: "Test User",
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

  return {
    feature,
    featureId,
    user,
    parentTeam,
    childTeam,
    grandchildTeam,
    cleanup: async () => {
      await prisma.teamFeatures.deleteMany({
        where: {
          teamId: {
            in: [parentTeam.id, childTeam.id, grandchildTeam.id],
          },
        },
      });
      await prisma.membership.deleteMany({
        where: {
          userId: user.id,
        },
      });
      await prisma.team.deleteMany({
        where: { id: grandchildTeam.id },
      });
      await prisma.team.deleteMany({
        where: { id: childTeam.id },
      });
      await prisma.team.deleteMany({
        where: { id: parentTeam.id },
      });
      await prisma.user.deleteMany({
        where: { id: user.id },
      });
    },
  };
}

describe("PrismaUserFeatureRepository Integration Tests", () => {
  describe("checkIfUserBelongsToTeamWithFeature", () => {
    it("should return true when user belongs to a team with the feature enabled", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(true);

      await testData.cleanup();
    });

    it("should return false when user belongs to a team but feature is not enabled", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(false);

      await testData.cleanup();
    });

    it("should return false when user membership is not accepted", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(false);

      await testData.cleanup();
    });

    it("should return true when parent team has feature enabled (hierarchical lookup)", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.parentTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(true);

      await testData.cleanup();
    });

    it("should return true when grandparent team has feature enabled (deep hierarchical lookup)", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.grandchildTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.parentTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(true);

      await testData.cleanup();
    });

    it("should return false when user does not belong to any team", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      const result = await repository.checkIfUserBelongsToTeamWithFeature(testData.user.id, testData.featureId);

      expect(result).toBe(false);

      await testData.cleanup();
    });
  });

  describe("checkIfUserBelongsToTeamWithFeatureNonHierarchical", () => {
    it("should return true when user belongs to a team with the feature directly enabled", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        testData.user.id,
        testData.featureId
      );

      expect(result).toBe(true);

      await testData.cleanup();
    });

    it("should return false when user belongs to a team but feature is not enabled", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        testData.user.id,
        testData.featureId
      );

      expect(result).toBe(false);

      await testData.cleanup();
    });

    it("should return false when only parent team has feature (non-hierarchical does not traverse)", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.parentTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        testData.user.id,
        testData.featureId
      );

      expect(result).toBe(false);

      await testData.cleanup();
    });

    it("should return false when user membership is not accepted", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: testData.childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testData.childTeam.id,
          featureId: testData.featureId,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        testData.user.id,
        testData.featureId
      );

      expect(result).toBe(false);

      await testData.cleanup();
    });

    it("should return false when user does not belong to any team", async () => {
      const testData = await createTestData();
      const repository = new PrismaUserFeatureRepository(prisma);

      const result = await repository.checkIfUserBelongsToTeamWithFeatureNonHierarchical(
        testData.user.id,
        testData.featureId
      );

      expect(result).toBe(false);

      await testData.cleanup();
    });
  });
});
