import { describe, expect, beforeAll, afterAll, afterEach, beforeEach, it } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import { FeatureOptInService } from "./FeatureOptInService";

// Helper to generate unique feature slug per test
const createTestFeature = () =>
  `test-opt-in-feature-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` as FeatureId;

// Access private clearCache method through type assertion
const clearFeaturesCache = (repo: FeaturesRepository) => {
  (repo as unknown as { clearCache: () => void }).clearCache();
};

describe("FeatureOptInService Integration Tests", () => {
  let testUser: { id: number };
  let testTeam: { id: number };
  let testTeam2: { id: number };
  let testOrg: { id: number };
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

    // Create test org
    testOrg = await prisma.team.create({
      data: {
        name: `Test OptIn Org ${Date.now()}`,
        slug: `test-opt-in-org-${Date.now()}`,
        isOrganization: true,
      },
    });

    // Create test teams
    testTeam = await prisma.team.create({
      data: {
        name: `Test OptIn Team ${Date.now()}`,
        slug: `test-opt-in-team-${Date.now()}`,
        parentId: testOrg.id,
      },
    });

    testTeam2 = await prisma.team.create({
      data: {
        name: `Test OptIn Team 2 ${Date.now()}`,
        slug: `test-opt-in-team-2-${Date.now()}`,
        parentId: testOrg.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order to respect foreign key constraints
    await prisma.userFeatures.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: { in: [testTeam.id, testTeam2.id, testOrg.id] } },
    });
    await prisma.feature.deleteMany({
      where: { slug: { in: createdFeatures } },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.team.deleteMany({
      where: { id: { in: [testTeam.id, testTeam2.id] } },
    });
    await prisma.team.deleteMany({
      where: { id: testOrg.id },
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
      where: { teamId: { in: [testTeam.id, testTeam2.id, testOrg.id] } },
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

  describe("resolveFeatureStatesAcrossTeams", () => {
    describe("global feature disabled", () => {
      it("should return effectiveEnabled=false regardless of other states", async () => {
        const testFeature = await setupFeature(false);

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.effectiveEnabled).toBe(false);
      });
    });

    describe("org disabled", () => {
      it("should return effectiveEnabled=false regardless of team and user states", async () => {
        const testFeature = await setupFeature(true);

        // Org explicitly disables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        // Team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testTeam.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User enables
        await prisma.userFeatures.create({
          data: {
            userId: testUser.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("disabled");
        expect(status.effectiveEnabled).toBe(false);
      });
    });

    describe("org enabled", () => {
      it("should return effectiveEnabled=false when all teams are disabled", async () => {
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Both teams disable
        await prisma.teamFeatures.createMany({
          data: [
            { teamId: testTeam.id, featureId: testFeature, enabled: false, assignedBy: "test" },
            { teamId: testTeam2.id, featureId: testFeature, enabled: false, assignedBy: "test" },
          ],
        });

        // User enables
        await prisma.userFeatures.create({
          data: {
            userId: testUser.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id, testTeam2.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual(["disabled", "disabled"]);
        expect(status.effectiveEnabled).toBe(false);
      });

      it("should return effectiveEnabled=true when at least one team is enabled and user inherits", async () => {
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // One team enables, one disables
        await prisma.teamFeatures.createMany({
          data: [
            { teamId: testTeam.id, featureId: testFeature, enabled: true, assignedBy: "test" },
            { teamId: testTeam2.id, featureId: testFeature, enabled: false, assignedBy: "test" },
          ],
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id, testTeam2.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.userState).toBe("inherit");
        expect(status.effectiveEnabled).toBe(true);
      });

      it("should return effectiveEnabled=false when user explicitly disables", async () => {
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testTeam.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User disables
        await prisma.userFeatures.create({
          data: {
            userId: testUser.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.userState).toBe("disabled");
        expect(status.effectiveEnabled).toBe(false);
      });

      it("should return effectiveEnabled=true when teams inherit from enabled org", async () => {
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Teams inherit (no rows)

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual(["inherit"]);
        expect(status.effectiveEnabled).toBe(true);
      });
    });

    describe("org inherits (or no org)", () => {
      it("should return effectiveEnabled=false when all teams are disabled", async () => {
        const testFeature = await setupFeature(true);

        // Team disables
        await prisma.teamFeatures.create({
          data: {
            teamId: testTeam.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: null,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("inherit");
        expect(status.teamStates).toEqual(["disabled"]);
        expect(status.effectiveEnabled).toBe(false);
      });

      it("should return effectiveEnabled=true when at least one team is enabled", async () => {
        const testFeature = await setupFeature(true);

        // One team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testTeam.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: null,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.teamStates).toEqual(["enabled"]);
        expect(status.effectiveEnabled).toBe(true);
      });

      it("should return effectiveEnabled=false when teams only inherit (no explicit enablement)", async () => {
        const testFeature = await setupFeature(true);

        // No org, team inherits (no row)
        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: null,
          teamIds: [testTeam.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("inherit");
        expect(status.teamStates).toEqual(["inherit"]);
        expect(status.effectiveEnabled).toBe(false);
      });
    });

    describe("no teams", () => {
      it("should return effectiveEnabled=true when org is enabled and user inherits", async () => {
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: testOrg.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: testUser.id,
          orgId: testOrg.id,
          teamIds: [],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual([]);
        expect(status.effectiveEnabled).toBe(true);
      });
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
});
