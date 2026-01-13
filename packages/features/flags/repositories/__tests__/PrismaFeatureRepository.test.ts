import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import type { FeatureId } from "../../config";
import { PrismaFeatureRepository } from "../PrismaFeatureRepository";

describe("PrismaFeatureRepository", () => {
  let repository: PrismaFeatureRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new PrismaFeatureRepository(prismaMock);
  });

  describe("findAll", () => {
    it("should return all features ordered by slug", async () => {
      const mockFeatures = [
        { slug: "feature-a", enabled: true, description: null, stale: false, createdAt: new Date() },
        { slug: "feature-b", enabled: false, description: null, stale: false, createdAt: new Date() },
      ] as Feature[];

      prismaMock.feature.findMany.mockResolvedValue(mockFeatures);

      const result = await repository.findAll();

      expect(prismaMock.feature.findMany).toHaveBeenCalledWith({
        orderBy: { slug: "asc" },
      });
      expect(result).toEqual(mockFeatures);
    });
  });

  describe("findBySlug", () => {
    it("should return feature when found", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        stale: false,
        createdAt: new Date(),
      } as Feature;

      prismaMock.feature.findUnique.mockResolvedValue(mockFeature);

      const result = await repository.findBySlug("test-feature" as FeatureId);

      expect(prismaMock.feature.findUnique).toHaveBeenCalledWith({
        where: { slug: "test-feature" },
      });
      expect(result).toEqual(mockFeature);
    });

    it("should return null when feature not found", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(null);

      const result = await repository.findBySlug("nonexistent" as FeatureId);

      expect(result).toBeNull();
    });
  });

  describe("checkIfEnabledGlobally", () => {
    it("should return true when feature exists and is enabled", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: true,
        description: null,
        stale: false,
        createdAt: new Date(),
      } as Feature;

      prismaMock.feature.findUnique.mockResolvedValue(mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(true);
    });

    it("should return false when feature exists but is disabled", async () => {
      const mockFeature = {
        slug: "test-feature",
        enabled: false,
        description: null,
        stale: false,
        createdAt: new Date(),
      } as Feature;

      prismaMock.feature.findUnique.mockResolvedValue(mockFeature);

      const result = await repository.checkIfEnabledGlobally("test-feature" as FeatureId);

      expect(result).toBe(false);
    });

    it("should return false when feature does not exist", async () => {
      prismaMock.feature.findUnique.mockResolvedValue(null);

      const result = await repository.checkIfEnabledGlobally("nonexistent" as FeatureId);

      expect(result).toBe(false);
    });
  });

  describe("getFeatureFlagMap", () => {
    it("should return a map of feature flags", async () => {
      const mockFeatures = [
        { slug: "feature-a", enabled: true, description: null, stale: false, createdAt: new Date() },
        { slug: "feature-b", enabled: false, description: null, stale: false, createdAt: new Date() },
      ] as Feature[];

      prismaMock.feature.findMany.mockResolvedValue(mockFeatures);

      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual({
        "feature-a": true,
        "feature-b": false,
      });
    });

    it("should return empty object when no features exist", async () => {
      prismaMock.feature.findMany.mockResolvedValue([]);

      const result = await repository.getFeatureFlagMap();

      expect(result).toEqual({});
    });
  });
});
