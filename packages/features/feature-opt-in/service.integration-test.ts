import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import { FeatureOptInService } from "./FeatureOptInService";

const featuresRepository = new FeaturesRepository(prisma);
const service = new FeatureOptInService(featuresRepository);

describe("FeatureOptInService Integration Tests", () => {
  let testUser: { id: number };
  let testTeam: { id: number };
  const testFeature = "test-opt-in-feature";

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-opt-in-${Date.now()}@example.com`,
        username: `test-opt-in-${Date.now()}`,
      },
    });

    // Create test team
    testTeam = await prisma.team.create({
      data: {
        name: `Test OptIn Team ${Date.now()}`,
        slug: `test-opt-in-team-${Date.now()}`,
      },
    });

    // Create the feature globally enabled
    await prisma.feature.create({
      data: {
        slug: testFeature,
        enabled: true,
        type: "EXPERIMENT",
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
    // Reset feature states before each test
    await prisma.userFeatures.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUser.id },
    });

    // Ensure global feature is enabled
    await prisma.feature.update({
      where: { slug: testFeature },
      data: { enabled: true },
    });
  });

  describe("getFeatureStatusForUser", () => {
    it("should return effectiveEnabled=false when global feature is disabled", async () => {
      await prisma.feature.update({
        where: { slug: testFeature },
        data: { enabled: false },
      });

      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: null,
        featureId: testFeature,
      });

      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=false when team has enabled=false", async () => {
      // Create team with feature explicitly disabled
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.teamState).toBe("disabled");
      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=true when user has enabled=true and team has no row", async () => {
      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.userState).toBe("enabled");
      expect(status.teamState).toBe("inherit");
      expect(status.effectiveEnabled).toBe(true);
    });

    it("should return teamState=disabled only when team row exists with enabled=false", async () => {
      // Case 1: No team row
      let status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });
      expect(status.teamState).toBe("inherit");

      // Case 2: Team row with enabled=true
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });
      expect(status.teamState).toBe("enabled");

      // Case 3: Team row with enabled=false
      await prisma.teamFeatures.update({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
        data: { enabled: false },
      });

      status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });
      expect(status.teamState).toBe("disabled");
    });

    it("should return effectiveEnabled=false when user inherits and team is disabled", async () => {
      // Team explicitly disables the feature
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      // User has no explicit state (inherits)
      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.userState).toBe("inherit");
      expect(status.teamState).toBe("disabled");
      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=true when user inherits and team is enabled", async () => {
      // Team explicitly enables the feature
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // User has no explicit state (inherits)
      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.userState).toBe("inherit");
      expect(status.teamState).toBe("enabled");
      expect(status.effectiveEnabled).toBe(true);
    });

    it("should return effectiveEnabled=false when user inherits and team also inherits", async () => {
      // No user row, no team row - both inherit
      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.userState).toBe("inherit");
      expect(status.teamState).toBe("inherit");
      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=false when user explicitly disabled even if team enabled", async () => {
      // Team enables the feature
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // User explicitly disables
      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: testTeam.id,
        featureId: testFeature,
      });

      expect(status.userState).toBe("disabled");
      expect(status.teamState).toBe("enabled");
      expect(status.effectiveEnabled).toBe(false);
    });
  });

  describe("setUserFeatureState", () => {
    it("should delete the row when state is 'inherit'", async () => {
      // First create a row
      await prisma.userFeatures.create({
        data: {
          userId: testUser.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // Set to inherit (should delete)
      await service.setUserFeatureState({
        userId: testUser.id,
        featureId: testFeature,
        state: "inherit",
        assignedBy: testUser.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: testUser.id,
          featureId: testFeature,
        },
      });

      expect(row).toBeNull();
    });

    it("should upsert with enabled=true when state is 'enabled'", async () => {
      await service.setUserFeatureState({
        userId: testUser.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: testUser.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: testUser.id,
          featureId: testFeature,
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(true);
    });

    it("should upsert with enabled=false when state is 'disabled'", async () => {
      await service.setUserFeatureState({
        userId: testUser.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: testUser.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: testUser.id,
          featureId: testFeature,
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(false);
    });
  });

  describe("setTeamFeatureState", () => {
    it("should delete the row when state is 'inherit'", async () => {
      // First create a row
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // Set to inherit (should delete)
      await service.setTeamFeatureState({
        teamId: testTeam.id,
        featureId: testFeature,
        state: "inherit",
        assignedBy: testUser.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).toBeNull();
    });

    it("should upsert with enabled=true when state is 'enabled'", async () => {
      await service.setTeamFeatureState({
        teamId: testTeam.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: testUser.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(true);
    });

    it("should upsert with enabled=false when state is 'disabled'", async () => {
      await service.setTeamFeatureState({
        teamId: testTeam.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: testUser.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: testTeam.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(false);
    });
  });

  describe("getFeatureStatusForTeam", () => {
    it("should return effectiveEnabled=false when global feature is disabled", async () => {
      await prisma.feature.update({
        where: { slug: testFeature },
        data: { enabled: false },
      });

      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=true when team has enabled=true", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.teamState).toBe("enabled");
      expect(status.effectiveEnabled).toBe(true);
    });

    it("should return effectiveEnabled=false when team has enabled=false", async () => {
      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          enabled: false,
          assignedBy: "test",
        },
      });

      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.teamState).toBe("disabled");
      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=false when team inherits (no row)", async () => {
      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.teamState).toBe("inherit");
      expect(status.effectiveEnabled).toBe(false);
    });
  });
});
