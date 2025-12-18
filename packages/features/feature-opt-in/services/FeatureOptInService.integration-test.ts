import { describe, expect, it } from "vitest";

import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import { FeatureOptInService } from "./FeatureOptInService";

// Helper to generate unique identifiers per test
const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Access private clearCache method through type assertion
const clearFeaturesCache = (repo: FeaturesRepository) => {
  (repo as unknown as { clearCache: () => void }).clearCache();
};

interface TestEntities {
  user: { id: number };
  org: { id: number };
  team: { id: number };
  team2: { id: number };
  featuresRepository: FeaturesRepository;
  service: FeatureOptInService;
  createdFeatures: string[];
  setupFeature: (enabled?: boolean) => Promise<FeatureId>;
  cleanup: () => Promise<void>;
}

/**
 * Creates isolated test entities (user, org, teams) and returns them along with a cleanup function.
 * Each test gets its own entities, ensuring complete isolation even when tests run in parallel.
 */
async function setup(): Promise<TestEntities> {
  const id = uniqueId();
  const createdFeatures: string[] = [];

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `test-opt-in-${id}@example.com`,
      username: `test-opt-in-${id}`,
    },
  });

  // Create test org
  const org = await prisma.team.create({
    data: {
      name: `Test OptIn Org ${id}`,
      slug: `test-opt-in-org-${id}`,
      isOrganization: true,
    },
  });

  // Create test teams
  const team = await prisma.team.create({
    data: {
      name: `Test OptIn Team ${id}`,
      slug: `test-opt-in-team-${id}`,
      parentId: org.id,
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: `Test OptIn Team 2 ${id}`,
      slug: `test-opt-in-team-2-${id}`,
      parentId: org.id,
    },
  });

  const featuresRepository = new FeaturesRepository(prisma);
  const service = new FeatureOptInService(featuresRepository);

  // Helper to create a feature for a test and track it for cleanup
  const setupFeature = async (enabled = true): Promise<FeatureId> => {
    const featureSlug = `test-opt-in-feature-${uniqueId()}` as FeatureId;
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
  };

  // Cleanup function to be called after test completes
  const cleanup = async () => {
    // Clean up in correct order to respect foreign key constraints
    await prisma.userFeatures.deleteMany({
      where: { userId: user.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: { in: [team.id, team2.id, org.id] } },
    });
    await prisma.feature.deleteMany({
      where: { slug: { in: createdFeatures } },
    });
    await prisma.membership.deleteMany({
      where: { userId: user.id },
    });
    await prisma.team.deleteMany({
      where: { id: { in: [team.id, team2.id] } },
    });
    await prisma.team.deleteMany({
      where: { id: org.id },
    });
    await prisma.user.delete({
      where: { id: user.id },
    });
  };

  return {
    user,
    org,
    team,
    team2,
    featuresRepository,
    service,
    createdFeatures,
    setupFeature,
    cleanup,
  };
}

describe("FeatureOptInService Integration Tests", () => {
  describe("resolveFeatureStatesAcrossTeams", () => {
    describe("global feature disabled", () => {
      it("should return effectiveEnabled=false regardless of other states", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(false);

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });
    });

    describe("org disabled", () => {
      it("should return effectiveEnabled=false regardless of team and user states", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org explicitly disables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        // Team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User enables
        await prisma.userFeatures.create({
          data: {
            userId: user.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("disabled");
        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });
    });

    describe("org enabled", () => {
      it("should return effectiveEnabled=false when all teams are disabled", async () => {
        const { user, org, team, team2, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Both teams disable
        await prisma.teamFeatures.createMany({
          data: [
            { teamId: team.id, featureId: testFeature, enabled: false, assignedBy: "test" },
            { teamId: team2.id, featureId: testFeature, enabled: false, assignedBy: "test" },
          ],
        });

        // User enables
        await prisma.userFeatures.create({
          data: {
            userId: user.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id, team2.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual(["disabled", "disabled"]);
        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });

      it("should return effectiveEnabled=true when at least one team is enabled and user inherits", async () => {
        const { user, org, team, team2, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // One team enables, one disables
        await prisma.teamFeatures.createMany({
          data: [
            { teamId: team.id, featureId: testFeature, enabled: true, assignedBy: "test" },
            { teamId: team2.id, featureId: testFeature, enabled: false, assignedBy: "test" },
          ],
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id, team2.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.userState).toBe("inherit");
        expect(status.effectiveEnabled).toBe(true);
        await cleanup();
      });

      it("should return effectiveEnabled=false when user explicitly disables", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User disables
        await prisma.userFeatures.create({
          data: {
            userId: user.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.userState).toBe("disabled");
        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });

      it("should return effectiveEnabled=true when teams inherit from enabled org", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Teams inherit (no rows)

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual(["inherit"]);
        expect(status.effectiveEnabled).toBe(true);
        await cleanup();
      });
    });

    describe("org inherits (or no org)", () => {
      it("should return effectiveEnabled=false when all teams are disabled", async () => {
        const { user, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Team disables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: null,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("inherit");
        expect(status.teamStates).toEqual(["disabled"]);
        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });

      it("should return effectiveEnabled=true when at least one team is enabled", async () => {
        const { user, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // One team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: null,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.teamStates).toEqual(["enabled"]);
        expect(status.effectiveEnabled).toBe(true);
        await cleanup();
      });

      it("should return effectiveEnabled=false when teams only inherit (no explicit enablement)", async () => {
        const { user, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // No org, team inherits (no row)
        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: null,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("inherit");
        expect(status.teamStates).toEqual(["inherit"]);
        expect(status.effectiveEnabled).toBe(false);
        await cleanup();
      });
    });

    describe("no teams", () => {
      it("should return effectiveEnabled=true when org is enabled and user inherits", async () => {
        const { user, org, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("enabled");
        expect(status.teamStates).toEqual([]);
        expect(status.effectiveEnabled).toBe(true);
        await cleanup();
      });
    });
  });

  describe("setUserFeatureState", () => {
    it("should delete the row when state is 'inherit'", async () => {
      const { user, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      // First create a row
      await prisma.userFeatures.create({
        data: {
          userId: user.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // Set to inherit (should delete)
      await service.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "inherit",
        assignedBy: user.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(row).toBeNull();
      await cleanup();
    });

    it("should upsert with enabled=true when state is 'enabled'", async () => {
      const { user, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      await service.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: user.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(true);
      await cleanup();
    });

    it("should upsert with enabled=false when state is 'disabled'", async () => {
      const { user, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      await service.setUserFeatureState({
        userId: user.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: user.id,
      });

      const row = await prisma.userFeatures.findFirst({
        where: {
          userId: user.id,
          featureId: testFeature,
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(false);
      await cleanup();
    });
  });

  describe("setTeamFeatureState", () => {
    it("should delete the row when state is 'inherit'", async () => {
      const { user, team, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      // First create a row
      await prisma.teamFeatures.create({
        data: {
          teamId: team.id,
          featureId: testFeature,
          enabled: true,
          assignedBy: "test",
        },
      });

      // Set to inherit (should delete)
      await service.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "inherit",
        assignedBy: user.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).toBeNull();
      await cleanup();
    });

    it("should upsert with enabled=true when state is 'enabled'", async () => {
      const { user, team, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      await service.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "enabled",
        assignedBy: user.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(true);
      await cleanup();
    });

    it("should upsert with enabled=false when state is 'disabled'", async () => {
      const { user, team, service, setupFeature, cleanup } = await setup();
      const testFeature = await setupFeature(true);

      await service.setTeamFeatureState({
        teamId: team.id,
        featureId: testFeature,
        state: "disabled",
        assignedBy: user.id,
      });

      const row = await prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId: team.id,
            featureId: testFeature,
          },
        },
      });

      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(false);
      await cleanup();
    });
  });

  describe("auto-opt-in scenarios", () => {
    describe("user autoOptInFeatures", () => {
      it("should transform user state from 'inherit' to 'enabled' when user has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for user
        await prisma.user.update({
          where: { id: user.id },
          data: { autoOptInFeatures: true },
        });

        // Org enables (to allow team level)
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team enables (to allow user level)
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User has no explicit state (inherit), but autoOptInFeatures=true should enable
        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.userState).toBe("inherit"); // Raw state is still inherit
        expect(status.userAutoOptIn).toBe(true);
        expect(status.effectiveEnabled).toBe(true); // But effective is true due to auto-opt-in
        await cleanup();
      });

      it("should NOT transform explicit 'disabled' state when user has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for user
        await prisma.user.update({
          where: { id: user.id },
          data: { autoOptInFeatures: true },
        });

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team enables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // User explicitly disables
        await prisma.userFeatures.create({
          data: {
            userId: user.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.userState).toBe("disabled");
        expect(status.userAutoOptIn).toBe(true);
        expect(status.effectiveEnabled).toBe(false); // Explicit disabled takes precedence
        await cleanup();
      });
    });

    describe("team autoOptInFeatures", () => {
      it("should transform team state from 'inherit' to 'enabled' when team has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for team
        await prisma.team.update({
          where: { id: team.id },
          data: { autoOptInFeatures: true },
        });

        // Org enables (to allow team level)
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team has no explicit state (inherit), but autoOptInFeatures=true should enable
        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.teamStates).toEqual(["inherit"]); // Raw state is still inherit
        expect(status.teamAutoOptIns).toEqual([true]);
        expect(status.effectiveEnabled).toBe(true); // Effective is true due to team auto-opt-in
        await cleanup();
      });

      it("should NOT transform explicit 'disabled' state when team has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for team
        await prisma.team.update({
          where: { id: team.id },
          data: { autoOptInFeatures: true },
        });

        // Org enables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: true,
            assignedBy: "test",
          },
        });

        // Team explicitly disables
        await prisma.teamFeatures.create({
          data: {
            teamId: team.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.teamStates).toEqual(["disabled"]);
        expect(status.teamAutoOptIns).toEqual([true]);
        expect(status.effectiveEnabled).toBe(false); // Explicit disabled takes precedence
        await cleanup();
      });
    });

    describe("org autoOptInFeatures", () => {
      it("should transform org state from 'inherit' to 'enabled' when org has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for org
        await prisma.team.update({
          where: { id: org.id },
          data: { autoOptInFeatures: true },
        });

        // Org has no explicit state (inherit), but autoOptInFeatures=true should enable
        // Team inherits from org
        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("inherit"); // Raw state is still inherit
        expect(status.orgAutoOptIn).toBe(true);
        expect(status.effectiveEnabled).toBe(true); // Effective is true due to org auto-opt-in
        await cleanup();
      });

      it("should NOT transform explicit 'disabled' state when org has autoOptInFeatures=true", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for org
        await prisma.team.update({
          where: { id: org.id },
          data: { autoOptInFeatures: true },
        });

        // Org explicitly disables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("disabled");
        expect(status.orgAutoOptIn).toBe(true);
        expect(status.effectiveEnabled).toBe(false); // Explicit disabled takes precedence
        await cleanup();
      });
    });

    describe("auto-opt-in with org disabled blocking", () => {
      it("should return effectiveEnabled=false when user auto-opts-in but org is disabled", async () => {
        const { user, org, team, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Enable auto-opt-in for user
        await prisma.user.update({
          where: { id: user.id },
          data: { autoOptInFeatures: true },
        });

        // Org explicitly disables
        await prisma.teamFeatures.create({
          data: {
            teamId: org.id,
            featureId: testFeature,
            enabled: false,
            assignedBy: "test",
          },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.orgState).toBe("disabled");
        expect(status.userState).toBe("inherit");
        expect(status.userAutoOptIn).toBe(true);
        expect(status.effectiveEnabled).toBe(false); // Org disabled blocks everything
        await cleanup();
      });
    });

    describe("auto-opt-in flags in response", () => {
      it("should return correct auto-opt-in flags for all levels", async () => {
        const { user, org, team, team2, service, setupFeature, cleanup } = await setup();
        const testFeature = await setupFeature(true);

        // Set up different auto-opt-in states
        await prisma.user.update({
          where: { id: user.id },
          data: { autoOptInFeatures: true },
        });

        await prisma.team.update({
          where: { id: org.id },
          data: { autoOptInFeatures: false },
        });

        await prisma.team.update({
          where: { id: team.id },
          data: { autoOptInFeatures: true },
        });

        await prisma.team.update({
          where: { id: team2.id },
          data: { autoOptInFeatures: false },
        });

        const statusMap = await service.resolveFeatureStatesAcrossTeams({
          userId: user.id,
          orgId: org.id,
          teamIds: [team.id, team2.id],
          featureIds: [testFeature],
        });
        const status = statusMap[testFeature];

        expect(status.userAutoOptIn).toBe(true);
        expect(status.orgAutoOptIn).toBe(false);
        expect(status.teamAutoOptIns).toEqual([true, false]);
        await cleanup();
      });
    });
  });
});
