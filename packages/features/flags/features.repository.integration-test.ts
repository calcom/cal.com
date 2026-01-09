import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@calcom/prisma";

import type { FeatureId } from "./config";
import { FeaturesRepository } from "./features.repository";

// Helper to generate unique identifiers per test
const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Store cleanup functions to ensure they run even if tests fail
const cleanupFunctions: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

interface TestEntities {
  user: { id: number };
  team: { id: number };
  testFeature: FeatureId;
  featuresRepository: FeaturesRepository;
  clearCache: () => void;
}

/**
 * Creates isolated test entities (user, team) and returns them along with a cleanup function.
 * Each test gets its own entities, ensuring complete isolation even when tests run in parallel.
 */
async function setup(): Promise<TestEntities> {
  const id = uniqueId();
  const testFeature = `test-feature-${id}` as FeatureId;

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `test-${id}@example.com`,
      username: `test-${id}`,
    },
  });

  // Create test team
  const team = await prisma.team.create({
    data: {
      name: `Test Team ${id}`,
      slug: `test-team-${id}`,
    },
  });

  const featuresRepository = new FeaturesRepository(prisma);

  // Access private clearCache method through type assertion
  const clearCache = () => {
    (featuresRepository as unknown as { clearCache: () => void }).clearCache();
  };

  // Cleanup function - automatically registered with afterEach
  const cleanup = async () => {
    // Clean up in correct order to respect foreign key constraints
    await prisma.userFeatures.deleteMany({
      where: { userId: user.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: team.id },
    });
    await prisma.feature.deleteMany({
      where: { slug: testFeature },
    });
    await prisma.membership.deleteMany({
      where: { userId: user.id },
    });
    await prisma.team.deleteMany({
      where: { id: team.id },
    });
    await prisma.user.delete({
      where: { id: user.id },
    });
  };

  // Register cleanup to run automatically after each test
  cleanupFunctions.push(cleanup);

  return {
    user,
    team,
    testFeature,
    featuresRepository,
    clearCache,
  };
}

describe("FeaturesRepository Integration Tests", () => {
  describe("checkIfFeatureIsEnabledGlobally", () => {
    it("should return false when feature is not enabled globally", async () => {
      const { testFeature, featuresRepository } = await setup();

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
      const { testFeature, featuresRepository, clearCache } = await setup();

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
      const { user, testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return false when no UserFeatures row and no TeamFeatures row exist (tri-state inheritance)", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      // No UserFeatures row, no TeamFeatures row - should return false
      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user has feature directly assigned", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user has feature with enabled=false (tri-state)", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return false when user has enabled=false even if team has feature (tri-state blocks inheritance)", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // User is a member of the team
      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      // But user has explicitly disabled the feature
      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to team with feature", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user belongs to team with feature disabled (tri-state)", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to team where parent team has feature", async () => {
      const { user, team, testFeature, featuresRepository, clearCache } = await setup();

      // Create an organization
      const org = await prisma.team.create({
        data: {
          name: `Test Org ${uniqueId()}`,
          slug: `test-org-${uniqueId()}`,
          isOrganization: true,
        },
      });

      // Make the test team part of the organization
      await prisma.team.update({
        where: { id: team.id },
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

      // Create membership
      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(user.id, testFeature);
      expect(result).toBe(true);

      // Clean up organization
      await prisma.teamFeatures.deleteMany({
        where: { teamId: org.id },
      });
      await prisma.team.update({
        where: { id: team.id },
        data: { parentId: null },
      });
      await prisma.team.delete({
        where: { id: org.id },
      });
    });
  });

  describe("checkIfTeamHasFeature", () => {
    it("should return false when team does not have feature", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.checkIfTeamHasFeature(team.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when team has feature directly assigned", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          assignedBy: "test",
          enabled: true,
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(team.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when team has feature with enabled=false (tri-state)", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(team.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when parent team has feature", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const parentTeam = await prisma.team.create({
        data: {
          name: `Parent Team ${uniqueId()}`,
          slug: `parent-team-${uniqueId()}`,
        },
      });

      await prisma.team.update({
        where: { id: team.id },
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

      const result = await featuresRepository.checkIfTeamHasFeature(team.id, testFeature);
      expect(result).toBe(true);

      // Clean up parent team
      await prisma.teamFeatures.deleteMany({
        where: { teamId: parentTeam.id },
      });
      await prisma.team.update({
        where: { id: team.id },
        data: { parentId: null },
      });
      await prisma.team.delete({
        where: { id: parentTeam.id },
      });
    });

    it("should return false when parent has feature with enabled=false (tri-state)", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const parentTeam = await prisma.team.create({
        data: {
          name: `Parent Team ${uniqueId()}`,
          slug: `parent-team-${uniqueId()}`,
        },
      });

      await prisma.team.update({
        where: { id: team.id },
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

      const result = await featuresRepository.checkIfTeamHasFeature(team.id, testFeature);
      expect(result).toBe(false);

      // Clean up parent team
      await prisma.teamFeatures.deleteMany({
        where: { teamId: parentTeam.id },
      });
      await prisma.team.update({
        where: { id: team.id },
        data: { parentId: null },
      });
      await prisma.team.delete({
        where: { id: parentTeam.id },
      });
    });
  });

  describe("checkIfUserHasFeatureNonHierarchical", () => {
    it("should return false when user does not have feature", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user has feature directly assigned", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(user.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user has feature with enabled=false (tri-state)", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(user.id, testFeature);
      expect(result).toBe(false);
    });

    it("should return true when user belongs to direct team with feature (non-hierarchical)", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(user.id, testFeature);
      expect(result).toBe(true);
    });

    it("should return false when user belongs to direct team with feature disabled (tri-state)", async () => {
      const { user, team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      const result = await featuresRepository.checkIfUserHasFeatureNonHierarchical(user.id, testFeature);
      expect(result).toBe(false);
    });
  });

  describe("setTeamFeatureState", () => {
    it("should create a new TeamFeatures row with enabled=true", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: "test-assigner",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(true);
      expect(teamFeature?.assignedBy).toBe("test-assigner");
    });

    it("should update existing TeamFeatures row to enabled=true", async () => {
      const { team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "original-assigner",
        },
      });

      // Now enable the feature
      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: "new-assigner",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(true);
      expect(teamFeature?.assignedBy).toBe("new-assigner");
    });

    it("should create a new TeamFeatures row with enabled=false", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: "test-assigner",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(false);
      expect(teamFeature?.assignedBy).toBe("test-assigner");
    });

    it("should update existing TeamFeatures row to enabled=false", async () => {
      const { team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "original-assigner",
        },
      });

      // Now disable the feature
      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: "new-assigner",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).not.toBeNull();
      expect(teamFeature?.enabled).toBe(false);
      expect(teamFeature?.assignedBy).toBe("new-assigner");
    });

    it("should delete TeamFeatures row when state is inherit", async () => {
      const { team, testFeature, featuresRepository } = await setup();

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
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "original-assigner",
        },
      });

      // Verify the row exists
      const beforeDelete = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });
      expect(beforeDelete).not.toBeNull();

      // Now set to inherit - should delete the row
      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "inherit",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).toBeNull();
    });

    it("should handle inherit state when no TeamFeatures row exists", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Call inherit without any existing row - should not throw
      await featuresRepository.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "inherit",
      });

      const teamFeature = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(teamFeature).toBeNull();
    });
  });

  describe("getTeamsWithFeatureEnabled", () => {
    it("should return empty array when no teams have the feature", async () => {
      const { testFeature, featuresRepository, clearCache } = await setup();

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
      const { team, testFeature, featuresRepository, clearCache } = await setup();

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
          name: `Second Team ${uniqueId()}`,
          slug: `second-team-${uniqueId()}`,
        },
      });

      // team has feature enabled
      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
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
      expect(result).toContain(team.id);
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
      const { team, testFeature, featuresRepository, clearCache } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: false, // Globally disabled
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
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

  describe("setUserFeatureState", () => {
    it("should create a new UserFeatures row with enabled=true when state is 'enabled'", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: "test-assigner",
      });

      const userFeature = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(userFeature).not.toBeNull();
      expect(userFeature?.enabled).toBe(true);
      expect(userFeature?.assignedBy).toBe("test-assigner");
    });

    it("should create a new UserFeatures row with enabled=false when state is 'disabled'", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await featuresRepository.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: "test-assigner",
      });

      const userFeature = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(userFeature).not.toBeNull();
      expect(userFeature?.enabled).toBe(false);
      expect(userFeature?.assignedBy).toBe("test-assigner");
    });

    it("should update existing UserFeatures row", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create with enabled=false first
      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "original-assigner",
        },
      });

      // Now enable the feature
      await featuresRepository.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: "new-assigner",
      });

      const userFeature = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(userFeature).not.toBeNull();
      expect(userFeature?.enabled).toBe(true);
      expect(userFeature?.assignedBy).toBe("new-assigner");
    });

    it("should delete the row when state is 'inherit'", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      // Create a row first
      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // Set to inherit (should delete)
      await featuresRepository.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "inherit",
      });

      const userFeature = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(userFeature).toBeNull();
    });
  });

  describe("getUserFeatureStates", () => {
    it("should return 'inherit' when user has no feature row", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.getUserFeatureStates({
        userId: user.id,
        featureIds: [testFeature],
      });

      expect(result[testFeature]).toBe("inherit");
    });

    it("should return 'enabled' when user has feature enabled", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.getUserFeatureStates({
        userId: user.id,
        featureIds: [testFeature],
      });

      expect(result[testFeature]).toBe("enabled");
    });

    it("should return 'disabled' when user has feature disabled", async () => {
      const { user, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.getUserFeatureStates({
        userId: user.id,
        featureIds: [testFeature],
      });

      expect(result[testFeature]).toBe("disabled");
    });

    it("should return states for multiple features in a single query", async () => {
      const { user, testFeature, featuresRepository } = await setup();
      const testFeature2 = `${testFeature}-2` as FeatureId;

      await prisma.feature.createMany({
        data: [
          { slug: testFeature, enabled: true, type: "OPERATIONAL" },
          { slug: testFeature2, enabled: true, type: "OPERATIONAL" },
        ],
      });

      await prisma.userFeatures.createMany({
        data: [
          { userId: user.id, featureId: testFeature, enabled: true, assignedBy: "test" },
          { userId: user.id, featureId: testFeature2, enabled: false, assignedBy: "test" },
        ],
      });

      const result = await featuresRepository.getUserFeatureStates({
        userId: user.id,
        featureIds: [testFeature, testFeature2],
      });

      expect(result[testFeature]).toBe("enabled");
      expect(result[testFeature2]).toBe("disabled");

      // Clean up extra feature
      await prisma.userFeatures.deleteMany({
        where: { userId: user.id, featureId: testFeature2 },
      });
      await prisma.feature.deleteMany({
        where: { slug: testFeature2 },
      });
    });
  });

  describe("getTeamsFeatureStates", () => {
    it("should return empty object for empty teamIds array", async () => {
      const { testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [],
        featureIds: [testFeature],
      });

      expect(result).toEqual({});
    });

    it("should return inherit (missing key) when team has no feature row", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id],
        featureIds: [testFeature],
      });

      // Teams without explicit state are not in the result (caller should default to 'inherit')
      expect(result[testFeature]?.[team.id]).toBeUndefined();
    });

    it("should return 'enabled' when team has feature enabled", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: { slug: testFeature, enabled: true, type: "OPERATIONAL" },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id],
        featureIds: [testFeature],
      });

      expect(result[testFeature]?.[team.id]).toBe("enabled");
    });

    it("should return 'disabled' when team has feature disabled", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      await prisma.feature.create({
        data: { slug: testFeature, enabled: true, type: "OPERATIONAL" },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id],
        featureIds: [testFeature],
      });

      expect(result[testFeature]?.[team.id]).toBe("disabled");
    });

    it("should return states for multiple teams in a single query", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const secondTeam = await prisma.team.create({
        data: { name: `Second Test Team ${uniqueId()}`, slug: `second-test-team-${uniqueId()}` },
      });

      await prisma.feature.create({
        data: { slug: testFeature, enabled: true, type: "OPERATIONAL" },
      });

      await prisma.teamFeatures.createMany({
        data: [
          { teamId: team.id, featureId: testFeature, enabled: true, assignedBy: "test" },
          { teamId: secondTeam.id, featureId: testFeature, enabled: false, assignedBy: "test" },
        ],
      });

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id, secondTeam.id],
        featureIds: [testFeature],
      });

      expect(result[testFeature]?.[team.id]).toBe("enabled");
      expect(result[testFeature]?.[secondTeam.id]).toBe("disabled");

      // Clean up
      await prisma.teamFeatures.deleteMany({
        where: { teamId: secondTeam.id },
      });
      await prisma.team.delete({
        where: { id: secondTeam.id },
      });
    });

    it("should only return teams with explicit state, not all requested teams", async () => {
      const { team, testFeature, featuresRepository } = await setup();

      const secondTeam = await prisma.team.create({
        data: { name: `Second Test Team ${uniqueId()}`, slug: `second-test-team-${uniqueId()}` },
      });

      await prisma.feature.create({
        data: { slug: testFeature, enabled: true, type: "OPERATIONAL" },
      });

      // Only set feature for team, not secondTeam
      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id, secondTeam.id],
        featureIds: [testFeature],
      });

      expect(result[testFeature]?.[team.id]).toBe("enabled");
      expect(result[testFeature]?.[secondTeam.id]).toBeUndefined(); // Not in result, caller defaults to 'inherit'

      // Clean up
      await prisma.team.delete({
        where: { id: secondTeam.id },
      });
    });

    it("should return states for multiple features across teams", async () => {
      const { team, testFeature, featuresRepository } = await setup();
      const secondFeature = `${testFeature}-two` as FeatureId;

      await prisma.feature.createMany({
        data: [
          { slug: testFeature, enabled: true, type: "OPERATIONAL" },
          { slug: secondFeature, enabled: true, type: "OPERATIONAL" },
        ],
      });

      await prisma.teamFeatures.createMany({
        data: [
          { teamId: team.id, featureId: testFeature, enabled: true, assignedBy: "test" },
          { teamId: team.id, featureId: secondFeature, enabled: false, assignedBy: "test" },
        ],
      });

      const result = await featuresRepository.getTeamsFeatureStates({
        teamIds: [team.id],
        featureIds: [testFeature, secondFeature],
      });

      expect(result[testFeature]?.[team.id]).toBe("enabled");
      expect(result[secondFeature]?.[team.id]).toBe("disabled");

      await prisma.teamFeatures.deleteMany({
        where: { teamId: team.id, featureId: { in: [testFeature, secondFeature] } },
      });
      await prisma.feature.deleteMany({
        where: { slug: secondFeature },
      });
    });
  });

  describe("getUserAutoOptIn", () => {
    it("should return false when user has autoOptInFeatures=false (default)", async () => {
      const { user, featuresRepository } = await setup();

      const result = await featuresRepository.getUserAutoOptIn(user.id);
      expect(result).toBe(false);
    });

    it("should return true when user has autoOptInFeatures=true", async () => {
      const { user, featuresRepository } = await setup();

      await prisma.user.update({
        where: { id: user.id },
        data: { autoOptInFeatures: true },
      });

      const result = await featuresRepository.getUserAutoOptIn(user.id);
      expect(result).toBe(true);
    });

    it("should return false for non-existent user", async () => {
      const { featuresRepository } = await setup();

      const result = await featuresRepository.getUserAutoOptIn(999999);
      expect(result).toBe(false);
    });
  });

  describe("getTeamsAutoOptIn", () => {
    it("should return empty object for empty teamIds array", async () => {
      const { featuresRepository } = await setup();

      const result = await featuresRepository.getTeamsAutoOptIn([]);
      expect(result).toEqual({});
    });

    it("should return false for team with autoOptInFeatures=false (default)", async () => {
      const { team, featuresRepository } = await setup();

      const result = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(result[team.id]).toBe(false);
    });

    it("should return true for team with autoOptInFeatures=true", async () => {
      const { team, featuresRepository } = await setup();

      await prisma.team.update({
        where: { id: team.id },
        data: { autoOptInFeatures: true },
      });

      const result = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(result[team.id]).toBe(true);
    });

    it("should return values for multiple teams in a single query", async () => {
      const { team, featuresRepository } = await setup();

      const secondTeam = await prisma.team.create({
        data: {
          name: `Second Team ${uniqueId()}`,
          slug: `second-team-auto-opt-in-${uniqueId()}`,
          autoOptInFeatures: true,
        },
      });

      // team has autoOptInFeatures=false (default)
      // secondTeam has autoOptInFeatures=true

      const result = await featuresRepository.getTeamsAutoOptIn([team.id, secondTeam.id]);
      expect(result[team.id]).toBe(false);
      expect(result[secondTeam.id]).toBe(true);

      // Clean up
      await prisma.team.delete({
        where: { id: secondTeam.id },
      });
    });

    it("should not include non-existent teams in result", async () => {
      const { team, featuresRepository } = await setup();

      const result = await featuresRepository.getTeamsAutoOptIn([team.id, 999999]);
      expect(result[team.id]).toBe(false);
      expect(result[999999]).toBeUndefined();
    });
  });

  describe("setUserAutoOptIn", () => {
    it("should set autoOptInFeatures to true", async () => {
      const { user, featuresRepository } = await setup();

      // Ensure user starts with false
      const before = await featuresRepository.getUserAutoOptIn(user.id);
      expect(before).toBe(false);

      await featuresRepository.setUserAutoOptIn(user.id, true);

      const after = await featuresRepository.getUserAutoOptIn(user.id);
      expect(after).toBe(true);
    });

    it("should set autoOptInFeatures to false", async () => {
      const { user, featuresRepository } = await setup();

      // First set to true
      await featuresRepository.setUserAutoOptIn(user.id, true);
      const before = await featuresRepository.getUserAutoOptIn(user.id);
      expect(before).toBe(true);

      // Now set to false
      await featuresRepository.setUserAutoOptIn(user.id, false);

      const after = await featuresRepository.getUserAutoOptIn(user.id);
      expect(after).toBe(false);
    });
  });

  describe("setTeamAutoOptIn", () => {
    it("should set autoOptInFeatures to true", async () => {
      const { team, featuresRepository } = await setup();

      // Ensure team starts with false
      const before = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(before[team.id]).toBe(false);

      await featuresRepository.setTeamAutoOptIn(team.id, true);

      const after = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(after[team.id]).toBe(true);
    });

    it("should set autoOptInFeatures to false", async () => {
      const { team, featuresRepository } = await setup();

      // First set to true
      await featuresRepository.setTeamAutoOptIn(team.id, true);
      const before = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(before[team.id]).toBe(true);

      // Now set to false
      await featuresRepository.setTeamAutoOptIn(team.id, false);

      const after = await featuresRepository.getTeamsAutoOptIn([team.id]);
      expect(after[team.id]).toBe(false);
    });
  });
});
