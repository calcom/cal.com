import { PrismaClient } from "@prisma/client";
import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import type { AppFlags } from "./config";
import { FeaturesRepository } from "./features.repository";

const prisma = new PrismaClient();
const featuresRepository = new FeaturesRepository();

// Access private clearCache method through type assertion
const clearCache = () => {
  (featuresRepository as any).clearCache();
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
        },
      });

      const result = await featuresRepository.checkIfUserHasFeature(testUser.id, testFeature);
      expect(result).toBe(true);
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
        },
      });

      const result = await featuresRepository.checkIfTeamHasFeature(testTeam.id, testFeature);
      expect(result).toBe(true);
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
  });
});
