import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFeaturesRepository } from "./FeaturesRepository";

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanupFunctions: Array<() => Promise<void>> = [];

beforeEach(() => {
  (FeaturesRepository as unknown as { featuresCache: unknown }).featuresCache = null;
});

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

interface TestEntities {
  testFeatureSlug: string;
  testUserId?: number;
  testTeamId?: number;
}

async function setup(options?: { withUser?: boolean; withTeam?: boolean }): Promise<TestEntities> {
  const id = uniqueId();
  const testFeatureSlug = `test-features-repo-${id}`;

  await prisma.feature.upsert({
    where: { slug: testFeatureSlug },
    create: {
      slug: testFeatureSlug,
      enabled: true,
      type: "OPERATIONAL",
      description: "Test feature for FeaturesRepository integration test",
    },
    update: {},
  });

  let testUserId: number | undefined;
  let testTeamId: number | undefined;

  if (options?.withUser) {
    const user = await prisma.user.create({
      data: {
        email: `fr-user-${id}@example.com`,
        username: `fr-user-${id}`,
        name: "FeaturesRepository Test User",
      },
    });
    testUserId = user.id;
  }

  if (options?.withTeam) {
    const team = await prisma.team.create({
      data: {
        name: `fr-team-${id}`,
        slug: `fr-team-${id}`,
      },
    });
    testTeamId = team.id;
  }

  const cleanup = async () => {
    if (testUserId) {
      await prisma.userFeatures.deleteMany({ where: { userId: testUserId } });
      await prisma.availability.deleteMany({
        where: { Schedule: { userId: testUserId } },
      });
      await prisma.schedule.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    if (testTeamId) {
      await prisma.teamFeatures.deleteMany({ where: { teamId: testTeamId } });
      await prisma.team.deleteMany({ where: { id: testTeamId } });
    }
    await prisma.feature.deleteMany({
      where: { slug: testFeatureSlug },
    });
  };

  cleanupFunctions.push(cleanup);

  return {
    testFeatureSlug,
    testUserId,
    testTeamId,
  };
}

describe("FeaturesRepository DI Container Integration Tests", () => {
  describe("getFeaturesRepository", () => {
    it("should return the cached repository instance", () => {
      const repo1 = getFeaturesRepository();
      const repo2 = getFeaturesRepository();

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).toBe(repo2);
    });

    it("should get all features", async () => {
      const { testFeatureSlug } = await setup();

      const repo = getFeaturesRepository();
      const features = await repo.getAllFeatures();

      expect(Array.isArray(features)).toBe(true);
      const testFeature = features.find((f) => f.slug === testFeatureSlug);
      expect(testFeature).toBeDefined();
      expect(testFeature?.enabled).toBe(true);
    });

    it("should get feature flag map", async () => {
      const { testFeatureSlug } = await setup();

      const repo = getFeaturesRepository();
      const flagMap = await repo.getFeatureFlagMap();

      expect(typeof flagMap).toBe("object");
      expect(flagMap[testFeatureSlug as keyof typeof flagMap]).toBe(true);
    });

    it("should check if feature is enabled globally", async () => {
      const { testFeatureSlug } = await setup();

      const repo = getFeaturesRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally(testFeatureSlug as FeatureId);

      expect(isEnabled).toBe(true);
    });

    it("should return false for disabled feature", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.update({
        where: { slug: testFeatureSlug },
        data: { enabled: false },
      });

      const repo = getFeaturesRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally(testFeatureSlug as FeatureId);

      expect(isEnabled).toBe(false);
    });

    it("should return false for non-existent feature", async () => {
      const repo = getFeaturesRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally(
        "non-existent-feature-slug-xyz" as FeatureId
      );

      expect(isEnabled).toBe(false);
    });

    it("should get enabled team features", async () => {
      const { testFeatureSlug, testTeamId } = await setup({ withTeam: true });
      if (!testTeamId) throw new Error("testTeamId required");

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeamId,
          featureId: testFeatureSlug,
          enabled: true,
          assignedBy: "integration-test",
        },
      });

      const repo = getFeaturesRepository();
      const teamFeatures = await repo.getEnabledTeamFeatures(testTeamId);

      expect(teamFeatures).not.toBeNull();
      expect(teamFeatures?.[testFeatureSlug as keyof typeof teamFeatures]).toBe(true);
    });

    it("should check if user has feature", async () => {
      const { testFeatureSlug, testUserId } = await setup({ withUser: true });
      if (!testUserId) throw new Error("testUserId required");

      const repo = getFeaturesRepository();
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureSlug)).toBe(false);

      await repo.setUserFeatureState({
        userId: testUserId,
        featureId: testFeatureSlug as FeatureId,
        state: "enabled",
        assignedBy: "integration-test",
      });
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureSlug)).toBe(true);
    });

    it("should check if user has feature non-hierarchical", async () => {
      const { testFeatureSlug, testUserId } = await setup({ withUser: true });
      if (!testUserId) throw new Error("testUserId required");

      const repo = getFeaturesRepository();
      expect(await repo.checkIfUserHasFeatureNonHierarchical(testUserId, testFeatureSlug)).toBe(false);

      await repo.setUserFeatureState({
        userId: testUserId,
        featureId: testFeatureSlug as FeatureId,
        state: "enabled",
        assignedBy: "integration-test",
      });
      expect(await repo.checkIfUserHasFeatureNonHierarchical(testUserId, testFeatureSlug)).toBe(true);
    });

    it("should set user feature state enabled, disabled, inherit", async () => {
      const { testFeatureSlug, testUserId } = await setup({ withUser: true });
      if (!testUserId) throw new Error("testUserId required");
      const featureId = testFeatureSlug as FeatureId;

      const repo = getFeaturesRepository();
      await repo.setUserFeatureState({ userId: testUserId, featureId, state: "enabled", assignedBy: "test" });
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureSlug)).toBe(true);

      await repo.setUserFeatureState({
        userId: testUserId,
        featureId,
        state: "disabled",
        assignedBy: "test",
      });
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureSlug)).toBe(false);

      await repo.setUserFeatureState({ userId: testUserId, featureId, state: "inherit" });
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureSlug)).toBe(false);
    });

    it("should check if team has feature", async () => {
      const { testFeatureSlug, testTeamId } = await setup({ withTeam: true });
      if (!testTeamId) throw new Error("testTeamId required");
      const featureId = testFeatureSlug as FeatureId;

      const repo = getFeaturesRepository();
      expect(await repo.checkIfTeamHasFeature(testTeamId, featureId)).toBe(false);

      await repo.setTeamFeatureState({
        teamId: testTeamId,
        featureId,
        state: "enabled",
        assignedBy: "integration-test",
      });
      expect(await repo.checkIfTeamHasFeature(testTeamId, featureId)).toBe(true);
    });

    it("should set team feature state enabled, disabled, inherit", async () => {
      const { testFeatureSlug, testTeamId } = await setup({ withTeam: true });
      if (!testTeamId) throw new Error("testTeamId required");
      const featureId = testFeatureSlug as FeatureId;

      const repo = getFeaturesRepository();
      await repo.setTeamFeatureState({
        teamId: testTeamId,
        featureId,
        state: "enabled",
        assignedBy: "integration-test",
      });
      expect(await repo.checkIfTeamHasFeature(testTeamId, featureId)).toBe(true);

      await repo.setTeamFeatureState({
        teamId: testTeamId,
        featureId,
        state: "disabled",
        assignedBy: "integration-test",
      });
      expect(await repo.checkIfTeamHasFeature(testTeamId, featureId)).toBe(false);

      await repo.setTeamFeatureState({ teamId: testTeamId, featureId, state: "inherit" });
      expect(await repo.checkIfTeamHasFeature(testTeamId, featureId)).toBe(false);
    });

    it("should get teams with feature enabled", async () => {
      const { testFeatureSlug, testTeamId } = await setup({ withTeam: true });
      if (!testTeamId) throw new Error("testTeamId required");
      const featureId = testFeatureSlug as FeatureId;

      const repo = getFeaturesRepository();
      expect(await repo.getTeamsWithFeatureEnabled(featureId)).not.toContain(testTeamId);

      await repo.setTeamFeatureState({
        teamId: testTeamId,
        featureId,
        state: "enabled",
        assignedBy: "integration-test",
      });
      const teamIds = await repo.getTeamsWithFeatureEnabled(featureId);
      expect(teamIds).toContain(testTeamId);
    });
  });
});
