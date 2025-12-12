import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import { prisma } from "@calcom/prisma";

import type { AppFlags } from "./config";
import { FeaturesRepository } from "./features.repository";

const featuresRepository = new FeaturesRepository(prisma);

// Access private clearCache method through type assertion
const clearCache = () => {
  (featuresRepository as unknown as { clearCache: () => void }).clearCache();
};

describe("FeaturesRepository Integration Tests", () => {
  let testUser: { id: number };
  let testTeam: { id: number };
  const testFeature = "teams" as keyof AppFlags;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        username: `test-${Date.now()}`,
      },
    });

    // Create test team
    testTeam = await prisma.team.create({
      data: {
        name: `Test Team ${Date.now()}`,
        slug: `test-team-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order to respect foreign key constraints
    await prisma.userFeatures.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.feature.deleteMany({
      where: { slug: testFeature },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.team.deleteMany({
      where: { id: testTeam.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  beforeEach(async () => {
    // Reset feature state before each test
    await prisma.feature.deleteMany({
      where: { slug: testFeature },
    });
    await prisma.userFeatures.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.membership.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.team.deleteMany({
      where: { id: testTeam.id },
    });

    // Recreate test team
    testTeam = await prisma.team.create({
      data: {
        name: `Test Team ${Date.now()}`,
        slug: `test-team-${Date.now()}`,
      },
    });

    // Clear the feature flag cache
    clearCache();
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    it("should return false when feature is not enabled globally", async () => {
      // Verify database state
      const dbFeature = await prisma.feature.findUnique({
        where: { slug: testFeature },
      });
      expect(dbFeature).toBeNull();

      // First call to initialize cache
      await featuresRepository.checkIfFeatureIsEnabledGlobally(testFeature);
      // Second call to get actual result
      const result = await featuresRepository.checkIfFeatureIsEnabledGlobally(testFeature);
      expect(result).toBe(false);
    });

    it("should return true when feature is enabled globally", async () => {
      // Create the feature with enabled set to true
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Clear the feature flag cache
      clearCache();

      // Verify database state
      const dbFeature = await prisma.feature.findUnique({
        where: { slug: testFeature },
      });
      expect(dbFeature).not.toBeNull();
      expect(dbFeature?.enabled).toBe(true);

      // First call to initialize cache
      await featuresRepository.checkIfFeatureIsEnabledGlobally(testFeature);
      // Second call to get actual result
      const result = await featuresRepository.checkIfFeatureIsEnabledGlobally(testFeature);
      expect(result).toBe(true);
    });
  });

  describe("checkIfUserHasFeature", () => {
    it("should return false when user does not have feature", async () => {
      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return false when no UserFeatures row and no TeamFeatures row exist (tri-state inheritance)", async () => {
      // Create the feature globally
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // User is a member of a team
      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      // No UserFeatures row, no TeamFeatures row - should return false
      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user has feature directly assigned", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user has feature with enabled=false (tri-state)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return false when user has enabled=false even if team has feature (tri-state blocks inheritance)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Team has the feature enabled
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // User is a member of the team
      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      // But user has explicitly disabled the feature
      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to team with feature", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user belongs to team with feature disabled (tri-state)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Team has the feature explicitly disabled
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to team where parent team has feature", async () => {
      // Create an organization
      const org = await prisma.team.create({
        data: {
          name: `Test Org ${Date.now()}`,
          slug: `test-org-${Date.now()}`,
          isOrganization: true,
        },
      });

      // Make the test team part of the organization
      await prisma.team.update({
        where: { id: testTeam.id },
        data: { parentId: org.id },
      });

      // Create the feature
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Clear the feature flag cache
      clearCache();

      // Assign feature to the organization
      await prisma.teamFeatures.create({
        data: {
          teamId: org.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      // Check if user is already a member of the team
      const existingMembership = await prisma.membership.findFirst({
        where: {
          teamId: testTeam.id,
          userId: testUser.id,
        },
      });

      // Only create membership if it doesn't exist
      if (!existingMembership) {
        await prisma.membership.create({
          data: {
            teamId: testTeam.id,
            userId: testUser.id,
            role: "MEMBER",
            accepted: true,
          },
        });
      }

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(true);

      // Clean up organization
      await prisma.teamFeatures.deleteMany({
        where: { teamId: org.id },
      });
      await prisma.team.delete({
        where: { id: org.id },
      });
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return false when team does not have feature", async () => {
      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when team has feature directly assigned", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when team has feature with enabled=false (tri-state)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when parent team has feature", async () => {
      const parentTeam = await prisma.team.create({
        data: {
          name: `Parent Team ${Date.now()}`,
          slug: `parent-team-${Date.now()}`,
        },
      });

      await prisma.team.update({
        where: { id: testTeam.id },
        data: { parentId: parentTeam.id },
      });

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: parentTeam.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(true);

      // Clean up parent team
      await prisma.teamFeatures.deleteMany({
        where: { teamId: parentTeam.id },
      });
      await prisma.team.delete({
        where: { id: parentTeam.id },
      });
    });

    it("should return false when parent has feature with enabled=false (tri-state)", async () => {
      const parentTeam = await prisma.team.create({
        data: {
          name: `Parent Team ${Date.now()}`,
          slug: `parent-team-${Date.now()}`,
        },
      });

      await prisma.team.update({
        where: { id: testTeam.id },
        data: { parentId: parentTeam.id },
      });

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Parent has the feature explicitly disabled
      await prisma.teamFeatures.create({
        data: {
          teamId: parentTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(false);

      // Clean up parent team
      await prisma.teamFeatures.deleteMany({
        where: { teamId: parentTeam.id },
      });
      await prisma.team.delete({
        where: { id: parentTeam.id },
      });
    });
  });

  describe("checkIfUserHasFeatureNonHierarchical", () => {
    it("should return false when user does not have feature", async () => {
      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user has feature directly assigned", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(testUser.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user has feature with enabled=false (tri-state)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(testUser.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to direct team with feature (non-hierarchical)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(testUser.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user belongs to direct team with feature disabled (tri-state)", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: testTeam.id,
          userId: testUser.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(testUser.id, testFeature);
      expect(result).toBe(false);
    });
  });

  describe("setTeamFeatureState", () => {
    it("should create a new TeamFeatures row with enabled=true", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "enabled", "test-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(true);
      expect(teamFeature?.assignedBy).toBe("test-assigner");
    });

    it("should update existing TeamFeatures row to enabled=true", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create with enabled=false first
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "original-assigner",
        },
      });

      // Now enable the feature
      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "enabled", "new-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(true);
      expect(teamFeature?.assignedBy).toBe("new-assigner");
    });

    it("should create a new TeamFeatures row with enabled=false", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "disabled", "test-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(false);
      expect(teamFeature?.assignedBy).toBe("test-assigner");
    });

    it("should update existing TeamFeatures row to enabled=false", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create with enabled=true first
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "original-assigner",
        },
      });

      // Now disable the feature
      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "disabled", "new-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(false);
      expect(teamFeature?.assignedBy).toBe("new-assigner");
    });

    it("should delete TeamFeatures row when state is inherit", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create a TeamFeatures row first
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "original-assigner",
        },
      });

      // Verify the row exists
      const beforeDelete = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });
      expect(beforeDelete).not.toBeNull();

      // Now set to inherit - should delete the row
      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "inherit", "test-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).toBeNull();
    });

    it("should handle inherit state when no TeamFeatures row exists", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Call inherit without any existing row - should not throw
      await featuresRepository.setTeamFeatureState(testTeam.id, testFeature, "inherit", "test-assigner");

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).toBeNull();
    });
  });

  describe("getTeamsWithFeatureEnabled", () => {
    it("should return empty array when no teams have the feature", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      clearCache();

      const result = await featuresRepository.getTeamsWithFeatureEnabled(testFeature);
      expect(result).toEqual([]);
    });

    it("should return teams with enabled=true only", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create a second team
      const secondTeam = await prisma.team.create({
        data: {
          name: `Second Team ${Date.now()}`,
          slug: `second-team-${Date.now()}`,
        },
      });

      // testTeam has feature enabled
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // secondTeam has feature disabled
      await prisma.teamFeatures.create({
        data: {
          teamId: secondTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      clearCache();

      const result = await featuresRepository.getTeamsWithFeatureEnabled(testFeature);
      expect(result).toContain(testTeam.id);
      expect(result).not.toContain(secondTeam.id);

      // Clean up second team
      await prisma.teamFeatures.deleteMany({
        where: { teamId: secondTeam.id },
      });
      await prisma.team.delete({
        where: { id: secondTeam.id },
      });
    });

    it("should return empty array when feature is not globally enabled", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: false, // Globally disabled
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      clearCache();

      const result = await featuresRepository.getTeamsWithFeatureEnabled(testFeature);
      expect(result).toEqual([]);
    });
  });
});
