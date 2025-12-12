import { describe, expect, beforeAll, afterAll, afterEach, beforeEach, it } from "vitest";

import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import { FeatureOptInService } from "./FeatureOptInService";

// Helper to generate unique feature slug per test
const createTestFeature = () =>
  `test-opt-in-feature-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` as keyof AppFlags;

// Access private clearCache method through type assertion
const clearFeaturesCache = (repo: FeaturesRepository) => {
  (repo as unknown as { clearCache: () => void }).clearCache();
};

describe("FeatureOptInService Integration Tests", () => {
  let testUser: { id: number };
  let testTeam: { id: number };
  let featuresRepository: FeaturesRepository;
  let service: FeatureOptInService;
  const createdFeatures: string[] = [];

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
      where: { slug: { in: createdFeatures } },
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

  beforeEach(() => {
    // Create fresh instances for each test to avoid cache issues
    featuresRepository = new FeaturesRepository(prisma);
    service = new FeatureOptInService(featuresRepository);
  });

  afterEach(async () => {
    // Clean up feature-related data after each test
    await prisma.userFeatures.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUser.id },
    });
  });

  // Helper to create a feature for a test and track it for cleanup
  async function setupFeature(enabled = true) {
    const featureSlug = createTestFeature();
    createdFeatures.push(featureSlug);
    await prisma.feature.create({
      data: {
        slug: featureSlug,
        enabled,
        type: "EXPERIMENT",
      },
    });
    // Clear cache after creating feature so getAllFeatures() returns fresh data
    clearFeaturesCache(featuresRepository);
    return featureSlug;
  }

  describe("getFeatureStatusForUser", () => {
    it("should return effectiveEnabled=false when global feature is disabled", async () => {
      const testFeature = await setupFeature(false);

      const status = await service.getFeatureStatusForUser({
        userId: testUser.id,
        teamId: null,
        featureId: testFeature,
      });

      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=false when team has enabled=false", async () => {
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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

      expect(status.globalEnabled).toBe(true);
      expect(status.userState).toBe("enabled");
      expect(status.teamState).toBe("inherit");
      expect(status.effectiveEnabled).toBe(true);
    });

    it("should return teamState=disabled only when team row exists with enabled=false", async () => {
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(false);

      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.effectiveEnabled).toBe(false);
    });

    it("should return effectiveEnabled=true when team has enabled=true", async () => {
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

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
      const testFeature = await setupFeature(true);

      const status = await service.getFeatureStatusForTeam({ teamId: testTeam.id, featureId: testFeature });

      expect(status.teamState).toBe("inherit");
      expect(status.effectiveEnabled).toBe(false);
    });
  });
});
