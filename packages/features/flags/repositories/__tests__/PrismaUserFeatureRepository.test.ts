import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { UserFeatures } from "@calcom/prisma/client";

import type { FeatureId } from "../../config";
import { PrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";

describe("PrismaUserFeatureRepository", () => {
  let repository: PrismaUserFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new PrismaUserFeatureRepository(prismaMock);
  });

  describe("findByUserId", () => {
    it("should return all user features for a user", async () => {
      const mockUserFeatures = [
        { userId: 1, featureId: "feature-a", enabled: true, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
        { userId: 1, featureId: "feature-b", enabled: false, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
      ] as UserFeatures[];

      prismaMock.userFeatures.findMany.mockResolvedValue(mockUserFeatures);

      const result = await repository.findByUserId(1);

      expect(prismaMock.userFeatures.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result).toEqual(mockUserFeatures);
    });
  });

  describe("findByUserIdAndFeatureId", () => {
    it("should return user feature when found", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      prismaMock.userFeatures.findUnique.mockResolvedValue(mockUserFeature);

      const result = await repository.findByUserIdAndFeatureId(1, "test-feature");

      expect(prismaMock.userFeatures.findUnique).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "test-feature",
          },
        },
      });
      expect(result).toEqual(mockUserFeature);
    });

    it("should return null when user feature not found", async () => {
      prismaMock.userFeatures.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserIdAndFeatureId(1, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByUserIdAndFeatureIds", () => {
    it("should return full UserFeatures objects for matching features", async () => {
      const mockUserFeatures = [
        { userId: 1, featureId: "feature-a", enabled: true, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
        { userId: 1, featureId: "feature-b", enabled: false, assignedBy: "admin", assignedAt: new Date(), updatedAt: new Date() },
      ] as UserFeatures[];

      prismaMock.userFeatures.findMany.mockResolvedValue(mockUserFeatures);

      const result = await repository.findByUserIdAndFeatureIds(1, [
        "feature-a" as FeatureId,
        "feature-b" as FeatureId,
        "feature-c" as FeatureId,
      ]);

      expect(prismaMock.userFeatures.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          featureId: { in: ["feature-a", "feature-b", "feature-c"] },
        },
      });
      expect(result).toEqual(mockUserFeatures);
    });

    it("should return empty array when no features found", async () => {
      prismaMock.userFeatures.findMany.mockResolvedValue([]);

      const result = await repository.findByUserIdAndFeatureIds(1, ["feature-a" as FeatureId]);

      expect(result).toEqual([]);
    });
  });

  describe("upsert", () => {
    it("should upsert user feature", async () => {
      const mockUserFeature = {
        userId: 1,
        featureId: "test-feature",
        enabled: true,
        assignedBy: "admin",
        assignedAt: new Date(),
        updatedAt: new Date(),
      } as UserFeatures;

      prismaMock.userFeatures.upsert.mockResolvedValue(mockUserFeature);

      const result = await repository.upsert(1, "test-feature" as FeatureId, true, "admin");

      expect(prismaMock.userFeatures.upsert).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "test-feature",
          },
        },
        create: {
          userId: 1,
          featureId: "test-feature",
          enabled: true,
          assignedBy: "admin",
        },
        update: {
          enabled: true,
          assignedBy: "admin",
        },
      });
      expect(result).toEqual(mockUserFeature);
    });
  });

  describe("delete", () => {
    it("should delete user feature", async () => {
      prismaMock.userFeatures.delete.mockResolvedValue({} as UserFeatures);

      await repository.delete(1, "test-feature" as FeatureId);

      expect(prismaMock.userFeatures.delete).toHaveBeenCalledWith({
        where: {
          userId_featureId: {
            userId: 1,
            featureId: "test-feature",
          },
        },
      });
    });
  });

  describe("findAutoOptInByUserId", () => {
    it("should return auto opt-in setting for user", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ autoOptInFeatures: true } as unknown as ReturnType<typeof prismaMock.user.findUnique>);

      const result = await repository.findAutoOptInByUserId(1);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { autoOptInFeatures: true },
      });
      expect(result).toBe(true);
    });

    it("should return false when user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await repository.findAutoOptInByUserId(1);

      expect(result).toBe(false);
    });
  });

  describe("updateAutoOptIn", () => {
    it("should update auto opt-in setting for user", async () => {
      prismaMock.user.update.mockResolvedValue({} as unknown as ReturnType<typeof prismaMock.user.update>);

      await repository.updateAutoOptIn(1, true);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { autoOptInFeatures: true },
      });
    });
  });
});
