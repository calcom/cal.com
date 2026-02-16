import { prisma } from "@calcom/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { getFeatureRepository } from "./FeatureRepository";

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanupFunctions: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

interface TestEntities {
  testFeatureSlug: string;
}

async function setup(): Promise<TestEntities> {
  const id = uniqueId();
  const testFeatureSlug = `test-memoize-feature-${id}`;

  const cleanup = async () => {
    await prisma.feature.deleteMany({
      where: { slug: testFeatureSlug },
    });
  };

  cleanupFunctions.push(cleanup);

  return {
    testFeatureSlug,
  };
}

describe("FeatureRepository DI Container Integration Tests", () => {
  describe("getFeatureRepository with @Memoize decorator", () => {
    it("should return the cached feature repository instance", () => {
      const repo1 = getFeatureRepository();
      const repo2 = getFeatureRepository();

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).toBe(repo2);
    });

    it("should find a feature by slug using the cached repository", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeatureSlug,
          enabled: true,
          type: "OPERATIONAL",
          description: "Test feature for memoize integration test",
        },
      });

      const repo = getFeatureRepository();
      const feature = await repo.findBySlug(testFeatureSlug);

      expect(feature).not.toBeNull();
      expect(feature?.slug).toBe(testFeatureSlug);
      expect(feature?.enabled).toBe(true);
    });

    it("should return null for non-existent feature", async () => {
      const { testFeatureSlug } = await setup();

      const repo = getFeatureRepository();
      const feature = await repo.findBySlug(testFeatureSlug);

      expect(feature).toBeNull();
    });

    it("should check if feature is enabled globally", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeatureSlug,
          enabled: true,
          type: "OPERATIONAL",
          description: "Test feature for memoize integration test",
        },
      });

      const repo = getFeatureRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally(testFeatureSlug);

      expect(isEnabled).toBe(true);
    });

    it("should return false for disabled feature", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeatureSlug,
          enabled: false,
          type: "OPERATIONAL",
          description: "Test feature for memoize integration test",
        },
      });

      const repo = getFeatureRepository();
      const isEnabled = await repo.checkIfFeatureIsEnabledGlobally(testFeatureSlug);

      expect(isEnabled).toBe(false);
    });

    it("should find all features", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeatureSlug,
          enabled: true,
          type: "OPERATIONAL",
          description: "Test feature for memoize integration test",
        },
      });

      const repo = getFeatureRepository();
      const features = await repo.findAll();

      expect(Array.isArray(features)).toBe(true);
      const testFeature = features.find((f) => f.slug === testFeatureSlug);
      expect(testFeature).toBeDefined();
    });

    it("should update a feature and invalidate cache via @Unmemoize", async () => {
      const { testFeatureSlug } = await setup();

      await prisma.feature.create({
        data: {
          slug: testFeatureSlug,
          enabled: false,
          type: "OPERATIONAL",
          description: "Test feature for memoize integration test",
        },
      });

      const repo = getFeatureRepository();

      const beforeUpdate = await repo.findBySlug(testFeatureSlug);
      expect(beforeUpdate?.enabled).toBe(false);

      await repo.update({
        featureId: testFeatureSlug as Parameters<typeof repo.update>[0]["featureId"],
        enabled: true,
      });

      const afterUpdate = await repo.findBySlug(testFeatureSlug);
      expect(afterUpdate?.enabled).toBe(true);
    });
  });
});
