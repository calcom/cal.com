import type { FeatureId } from "@calcom/features/flags/config";
import { prisma } from "@calcom/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { getUserFeatureRepository } from "./UserFeatureRepository";

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
  testUserId: number;
}

async function setup(): Promise<TestEntities> {
  const id = uniqueId();
  const testFeatureSlug = `test-user-feature-${id}`;

  await prisma.feature.upsert({
    where: { slug: testFeatureSlug },
    create: {
      slug: testFeatureSlug,
      enabled: true,
      type: "OPERATIONAL",
      description: "Test feature for UserFeatureRepository integration test",
    },
    update: {},
  });

  const testFeatureId = testFeatureSlug as FeatureId;

  const user = await prisma.user.create({
    data: {
      email: `ufr-test-${id}@example.com`,
      username: `ufr-test-${id}`,
      name: "UserFeatureRepository Test User",
    },
  });

  const cleanup = async () => {
    await prisma.userFeatures.deleteMany({
      where: { userId: user.id, featureId: testFeatureId },
    });
    await prisma.availability.deleteMany({
      where: { Schedule: { userId: user.id } },
    });
    await prisma.schedule.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.feature.deleteMany({ where: { slug: testFeatureSlug } });
  };

  cleanupFunctions.push(cleanup);

  return {
    testFeatureId,
    testUserId: user.id,
  };
}

describe("UserFeatureRepository DI Container Integration Tests", () => {
  describe("getUserFeatureRepository", () => {
    it("should return the cached repository instance", () => {
      const repo1 = getUserFeatureRepository();
      const repo2 = getUserFeatureRepository();

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).toBe(repo2);
    });

    it("should return null for non-existent user feature", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      const result = await repo.findByUserIdAndFeatureId(testUserId, testFeatureId);

      expect(result).toBeNull();
    });

    it("should upsert and find user feature", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      const upserted = await repo.upsert(testUserId, testFeatureId, true, "integration-test");

      expect(upserted.userId).toBe(testUserId);
      expect(upserted.featureId).toBe(testFeatureId);
      expect(upserted.enabled).toBe(true);

      const found = await repo.findByUserIdAndFeatureId(testUserId, testFeatureId);
      expect(found).not.toBeNull();
      expect(found?.enabled).toBe(true);
    });

    it("should upsert update existing feature to disabled", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      await repo.upsert(testUserId, testFeatureId, true, "integration-test");
      const updated = await repo.upsert(testUserId, testFeatureId, false, "integration-test");

      expect(updated.enabled).toBe(false);
      const found = await repo.findByUserIdAndFeatureId(testUserId, testFeatureId);
      expect(found?.enabled).toBe(false);
    });

    it("should return empty object for empty feature ids array", async () => {
      const { testUserId } = await setup();

      const repo = getUserFeatureRepository();
      const result = await repo.findByUserIdAndFeatureIds(testUserId, []);

      expect(result).toEqual({});
    });

    it("should find by multiple feature ids", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      await repo.upsert(testUserId, testFeatureId, true, "integration-test");

      const result = await repo.findByUserIdAndFeatureIds(testUserId, [testFeatureId]);
      expect(result[testFeatureId]).toBeDefined();
      expect(result[testFeatureId]?.enabled).toBe(true);
    });

    it("should check if user has feature", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureId)).toBe(false);

      await repo.upsert(testUserId, testFeatureId, true, "integration-test");
      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureId)).toBe(true);
    });

    it("should return false when user has feature explicitly disabled", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      await repo.upsert(testUserId, testFeatureId, false, "integration-test");

      expect(await repo.checkIfUserHasFeature(testUserId, testFeatureId)).toBe(false);
    });

    it("should check if user has feature non-hierarchical", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      expect(await repo.checkIfUserHasFeatureNonHierarchical(testUserId, testFeatureId)).toBe(false);

      await repo.upsert(testUserId, testFeatureId, true, "integration-test");
      expect(await repo.checkIfUserHasFeatureNonHierarchical(testUserId, testFeatureId)).toBe(true);
    });

    it("should return false for checkIfUserHasFeatureNonHierarchical when disabled", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      await repo.upsert(testUserId, testFeatureId, false, "integration-test");

      expect(await repo.checkIfUserHasFeatureNonHierarchical(testUserId, testFeatureId)).toBe(false);
    });

    it("should delete user feature", async () => {
      const { testFeatureId, testUserId } = await setup();

      const repo = getUserFeatureRepository();
      await repo.upsert(testUserId, testFeatureId, true, "integration-test");
      expect(await repo.findByUserIdAndFeatureId(testUserId, testFeatureId)).not.toBeNull();

      await repo.delete(testUserId, testFeatureId);
      expect(await repo.findByUserIdAndFeatureId(testUserId, testFeatureId)).toBeNull();
    });

    it("should get and set auto opt-in", async () => {
      const { testUserId } = await setup();

      const repo = getUserFeatureRepository();
      expect(await repo.findAutoOptInByUserId(testUserId)).toBe(false);

      await repo.setAutoOptIn(testUserId, true);
      expect(await repo.findAutoOptInByUserId(testUserId)).toBe(true);
    });
  });
});
