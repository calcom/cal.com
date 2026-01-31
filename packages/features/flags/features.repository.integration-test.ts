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
});
