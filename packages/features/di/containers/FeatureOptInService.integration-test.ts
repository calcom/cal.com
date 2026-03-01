import { prisma } from "@calcom/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { getFeatureOptInService } from "./FeatureOptInService";

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanupFunctions: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

describe("FeatureOptInService DI Container Integration Tests", () => {
  describe("getFeatureOptInService", () => {
    it("should return the cached service instance", () => {
      const service1 = getFeatureOptInService();
      const service2 = getFeatureOptInService();

      expect(service1).toBeDefined();
      expect(service2).toBeDefined();
      expect(service1).toBe(service2);
    });

    it("should list features for user", async () => {
      const id = uniqueId();
      const user = await prisma.user.create({
        data: {
          email: `fois-test-${id}@example.com`,
          username: `fois-test-${id}`,
          name: "FeatureOptInService Test User",
        },
      });

      cleanupFunctions.push(async () => {
        await prisma.availability.deleteMany({
          where: { Schedule: { userId: user.id } },
        });
        await prisma.schedule.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });

      const service = getFeatureOptInService();
      const features = await service.listFeaturesForUser({ userId: user.id });

      expect(Array.isArray(features)).toBe(true);
    });

    it("should list features for team", async () => {
      const id = uniqueId();
      const team = await prisma.team.create({
        data: {
          name: `fois-team-${id}`,
          slug: `fois-team-${id}`,
        },
      });

      cleanupFunctions.push(async () => {
        await prisma.team.deleteMany({ where: { id: team.id } });
      });

      const service = getFeatureOptInService();
      const features = await service.listFeaturesForTeam({ teamId: team.id });

      expect(Array.isArray(features)).toBe(true);
    });

    it("should check feature opt-in eligibility", async () => {
      const id = uniqueId();
      const user = await prisma.user.create({
        data: {
          email: `fois-elig-${id}@example.com`,
          username: `fois-elig-${id}`,
          name: "FeatureOptInService Eligibility Test User",
        },
      });

      cleanupFunctions.push(async () => {
        await prisma.availability.deleteMany({
          where: { Schedule: { userId: user.id } },
        });
        await prisma.schedule.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });

      const service = getFeatureOptInService();
      const result = await service.checkFeatureOptInEligibility({
        userId: user.id,
        featureId: "insights",
      });

      expect(result).toBeDefined();
      expect("canOptIn" in result).toBe(true);
    });
  });
});
