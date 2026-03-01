import type { FeatureId } from "@calcom/features/flags/config";
import { prisma } from "@calcom/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { getTeamFeatureRepository } from "./TeamFeatureRepository";

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanupFunctions: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

interface TestEntities {
  testFeatureId: FeatureId;
  testTeamId: number;
}

async function setup(): Promise<TestEntities> {
  const id = uniqueId();
  const testFeatureSlug = `test-team-feature-${id}`;

  await prisma.feature.upsert({
    where: { slug: testFeatureSlug },
    create: {
      slug: testFeatureSlug,
      enabled: true,
      type: "OPERATIONAL",
      description: "Test feature for TeamFeatureRepository integration test",
    },
    update: {},
  });

  const testFeatureId = testFeatureSlug as FeatureId;

  const team = await prisma.team.create({
    data: {
      name: `tfr-test-team-${id}`,
      slug: `tfr-test-team-${id}`,
    },
  });

  const cleanup = async () => {
    await prisma.teamFeatures.deleteMany({
      where: { teamId: team.id, featureId: testFeatureId },
    });
    await prisma.team.deleteMany({ where: { id: team.id } });
    await prisma.feature.deleteMany({ where: { slug: testFeatureSlug } });
  };

  cleanupFunctions.push(cleanup);

  return {
    testFeatureId,
    testTeamId: team.id,
  };
}

describe("TeamFeatureRepository DI Container Integration Tests", () => {
  describe("getTeamFeatureRepository", () => {
    it("should return the cached repository instance", () => {
      const repo1 = getTeamFeatureRepository();
      const repo2 = getTeamFeatureRepository();

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).toBe(repo2);
    });

    it("should return null for non-existent team feature", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      const result = await repo.findByTeamIdAndFeatureId(testTeamId, testFeatureId);

      expect(result).toBeNull();
    });

    it("should upsert and find team feature", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      const upserted = await repo.upsert(testTeamId, testFeatureId, true, "integration-test");

      expect(upserted.teamId).toBe(testTeamId);
      expect(upserted.featureId).toBe(testFeatureId);
      expect(upserted.enabled).toBe(true);

      const found = await repo.findByTeamIdAndFeatureId(testTeamId, testFeatureId);
      expect(found).not.toBeNull();
      expect(found?.enabled).toBe(true);
    });

    it("should upsert update existing team feature to disabled", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");
      const updated = await repo.upsert(testTeamId, testFeatureId, false, "integration-test");

      expect(updated.enabled).toBe(false);
      expect(await repo.checkIfTeamHasFeature(testTeamId, testFeatureId)).toBe(false);
    });

    it("should find by team ids and feature ids", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");

      const result = await repo.findByTeamIdsAndFeatureIds([testTeamId], [testFeatureId]);
      expect(result[testFeatureId]).toBeDefined();
      expect(result[testFeatureId]?.[testTeamId]).toBeDefined();
      expect(result[testFeatureId]?.[testTeamId]?.enabled).toBe(true);
    });

    it("should return empty object for empty team ids in findByTeamIdsAndFeatureIds", async () => {
      const { testFeatureId } = await setup();

      const repo = getTeamFeatureRepository();
      const result = await repo.findByTeamIdsAndFeatureIds([], [testFeatureId]);

      expect(result).toEqual({});
    });

    it("should get enabled features for team", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      expect(await repo.getEnabledFeatures(testTeamId)).toBeNull();

      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");
      const enabled = await repo.getEnabledFeatures(testTeamId);
      expect(enabled).not.toBeNull();
      expect(enabled?.[testFeatureId as keyof typeof enabled]).toBe(true);
    });

    it("should find auto opt-in by multiple team ids", async () => {
      const { testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      const result = await repo.findAutoOptInByTeamIds([testTeamId]);
      expect(result[testTeamId]).toBe(false);

      await repo.setAutoOptIn(testTeamId, true);
      const afterSet = await repo.findAutoOptInByTeamIds([testTeamId]);
      expect(afterSet[testTeamId]).toBe(true);
    });

    it("should check if team has feature", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      expect(await repo.checkIfTeamHasFeature(testTeamId, testFeatureId)).toBe(false);

      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");
      expect(await repo.checkIfTeamHasFeature(testTeamId, testFeatureId)).toBe(true);
    });

    it("should delete team feature", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");
      expect(await repo.findByTeamIdAndFeatureId(testTeamId, testFeatureId)).not.toBeNull();

      await repo.delete(testTeamId, testFeatureId);
      expect(await repo.findByTeamIdAndFeatureId(testTeamId, testFeatureId)).toBeNull();
    });

    it("should get teams with feature enabled", async () => {
      const { testFeatureId, testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      expect(await repo.getTeamsWithFeatureEnabled(testFeatureId)).not.toContain(testTeamId);

      await repo.upsert(testTeamId, testFeatureId, true, "integration-test");
      const teamIds = await repo.getTeamsWithFeatureEnabled(testFeatureId);
      expect(teamIds).toContain(testTeamId);
    });

    it("should get and set auto opt-in for team", async () => {
      const { testTeamId } = await setup();

      const repo = getTeamFeatureRepository();
      expect(await repo.findAutoOptInByTeamId(testTeamId)).toBe(false);

      await repo.setAutoOptIn(testTeamId, true);
      expect(await repo.findAutoOptInByTeamId(testTeamId)).toBe(true);
    });
  });
});
