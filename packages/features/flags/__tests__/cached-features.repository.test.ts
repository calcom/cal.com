import type { Feature } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { CachedFeaturesRepository } from "../cached-features.repository";
import type { FeatureId } from "../config";
import { FeaturesCacheEntries } from "../features-cache-keys";
import { MockRedisService } from "./mock-redis.service";
import { SpyFeaturesRepository } from "./spy-features.repository";

describe("CachedFeaturesRepository", () => {
  let mockRedis: MockRedisService;
  let spyRepository: SpyFeaturesRepository;
  let cachedRepository: CachedFeaturesRepository;

  beforeEach(() => {
    mockRedis = new MockRedisService();
    spyRepository = new SpyFeaturesRepository();
    cachedRepository = new CachedFeaturesRepository(spyRepository, mockRedis, {
      cacheTtlMs: 60000,
    });
  });

  describe("getAllFeatures", () => {
    it("should call repository on cache miss and cache the result", async () => {
      const mockFeatures: Feature[] = [
        {
          slug: "booking-audit",
          enabled: true,
          description: "Test feature",
          type: "OPERATIONAL",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: null,
        },
      ];
      spyRepository.mockAllFeatures = mockFeatures;

      const result = await cachedRepository.getAllFeatures();

      expect(result).toEqual(mockFeatures);
      expect(spyRepository.getAllFeaturesCalls).toBe(1);
      expect(mockRedis.setCalls).toHaveLength(1);
      expect(mockRedis.setCalls[0].key).toBe(
        FeaturesCacheEntries.allFeatures().key
      );
    });

    it("should return cached value on cache hit without calling repository", async () => {
      const cachedFeatures: Feature[] = [
        {
          slug: "cached-feature",
          enabled: true,
          description: "Cached",
          type: "OPERATIONAL",
          stale: false,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: null,
        },
      ];
      mockRedis.setStoreValue(
        FeaturesCacheEntries.allFeatures().key,
        cachedFeatures
      );

      const result = await cachedRepository.getAllFeatures();

      expect(result).toEqual(cachedFeatures);
      expect(spyRepository.getAllFeaturesCalls).toBe(0);
    });

    it("should delete invalid cache data and fetch from repository", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.allFeatures().key,
        "invalid-data"
      );
      const mockFeatures: Feature[] = [];
      spyRepository.mockAllFeatures = mockFeatures;

      const result = await cachedRepository.getAllFeatures();

      expect(result).toEqual(mockFeatures);
      expect(spyRepository.getAllFeaturesCalls).toBe(1);
      expect(mockRedis.delCalls).toContain(
        FeaturesCacheEntries.allFeatures().key
      );
    });
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    const testSlug = "emails" as FeatureId;

    it("should call repository on cache miss and cache the result", async () => {
      spyRepository.mockGlobalFeatureEnabled[testSlug] = true;

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(
        testSlug
      );

      expect(result).toBe(true);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toEqual([
        testSlug,
      ]);
      expect(mockRedis.setCalls).toHaveLength(1);
      expect(mockRedis.setCalls[0].key).toBe(
        FeaturesCacheEntries.globalFeature(testSlug).key
      );
      expect(mockRedis.setCalls[0].value).toBe(true);
    });

    it("should return cached value on cache hit without calling repository", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.globalFeature(testSlug).key,
        false
      );

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(
        testSlug
      );

      expect(result).toBe(false);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toHaveLength(
        0
      );
    });

    it("should handle cached false value correctly (not treat as cache miss)", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.globalFeature(testSlug).key,
        false
      );
      spyRepository.mockGlobalFeatureEnabled[testSlug] = true;

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(
        testSlug
      );

      expect(result).toBe(false);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toHaveLength(
        0
      );
    });
  });

  describe("getTeamsWithFeatureEnabled", () => {
    const testSlug = "teams" as FeatureId;

    it("should call repository on cache miss and cache the result", async () => {
      spyRepository.mockTeamsWithFeature[testSlug] = [1, 2, 3];

      const result = await cachedRepository.getTeamsWithFeatureEnabled(
        testSlug
      );

      expect(result).toEqual([1, 2, 3]);
      expect(spyRepository.getTeamsWithFeatureEnabledCalls).toEqual([testSlug]);
      expect(mockRedis.setCalls).toHaveLength(1);
    });

    it("should return cached value on cache hit without calling repository", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamsWithFeatureEnabled(testSlug).key,
        [4, 5]
      );

      const result = await cachedRepository.getTeamsWithFeatureEnabled(
        testSlug
      );

      expect(result).toEqual([4, 5]);
      expect(spyRepository.getTeamsWithFeatureEnabledCalls).toHaveLength(0);
    });
  });

  describe("checkIfUserHasFeature", () => {
    it("should always delegate to repository (no caching)", async () => {
      const userId = 123;
      const slug = "user-feature";
      spyRepository.mockUserHasFeature[`${userId}:${slug}`] = true;

      const result1 = await cachedRepository.checkIfUserHasFeature(
        userId,
        slug
      );
      const result2 = await cachedRepository.checkIfUserHasFeature(
        userId,
        slug
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(spyRepository.checkIfUserHasFeatureCalls).toHaveLength(2);
      expect(mockRedis.getCalls).toHaveLength(0);
      expect(mockRedis.setCalls).toHaveLength(0);
    });
  });

  describe("checkIfUserHasFeatureNonHierarchical", () => {
    const userId = 456;
    const slug = "non-hier-feature";

    it("should always delegate to repository (no caching for single feature checks)", async () => {
      spyRepository.mockUserHasFeatureNonHierarchical[`${userId}:${slug}`] =
        true;

      const result1 =
        await cachedRepository.checkIfUserHasFeatureNonHierarchical(
          userId,
          slug
        );
      const result2 =
        await cachedRepository.checkIfUserHasFeatureNonHierarchical(
          userId,
          slug
        );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(
        spyRepository.checkIfUserHasFeatureNonHierarchicalCalls
      ).toHaveLength(2);
      expect(mockRedis.getCalls).toHaveLength(0);
      expect(mockRedis.setCalls).toHaveLength(0);
    });
  });

  describe("getUserFeatureStates", () => {
    const userId = 789;
    const featureIds = ["emails", "insights", "teams"] as FeatureId[];

    it("should return all from cache on full cache hit", async () => {
      // Cache key now includes featureIds
      mockRedis.setStoreValue(
        FeaturesCacheEntries.userFeatureStates(userId, featureIds).key,
        {
          emails: "enabled",
          insights: "disabled",
          teams: "inherit",
        }
      );

      const result = await cachedRepository.getUserFeatureStates({
        userId,
        featureIds,
      });

      expect(result).toEqual({
        emails: "enabled",
        insights: "disabled",
        teams: "inherit",
      });
      expect(spyRepository.getUserFeatureStatesCalls).toHaveLength(0);
    });

    it("should fetch all features from repository on cache miss (no partial cache)", async () => {
      spyRepository.mockUserFeatureStates[userId] = {
        emails: "enabled",
        insights: "disabled",
        teams: "inherit",
      };

      const result = await cachedRepository.getUserFeatureStates({
        userId,
        featureIds,
      });

      expect(result).toEqual({
        emails: "enabled",
        insights: "disabled",
        teams: "inherit",
      });
      expect(spyRepository.getUserFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getUserFeatureStatesCalls[0].featureIds).toEqual(
        featureIds
      );
    });

    it("should cache the result with composite key (userId + featureIds)", async () => {
      spyRepository.mockUserFeatureStates[userId] = {
        emails: "enabled",
        insights: "disabled",
      };
      const twoFeatureIds = ["emails", "insights"] as FeatureId[];

      await cachedRepository.getUserFeatureStates({
        userId,
        featureIds: twoFeatureIds,
      });

      expect(mockRedis.setCalls).toHaveLength(1);
      expect(mockRedis.setCalls[0].key).toBe(
        FeaturesCacheEntries.userFeatureStates(userId, twoFeatureIds).key
      );
      expect(mockRedis.setCalls[0].value).toEqual({
        emails: "enabled",
        insights: "disabled",
      });
    });

    it("should generate same cache key regardless of featureIds order", async () => {
      const featureIdsA = ["insights", "emails"] as FeatureId[];
      const featureIdsB = ["emails", "insights"] as FeatureId[];

      // Both should generate the same cache key due to normalization (sort)
      expect(
        FeaturesCacheEntries.userFeatureStates(userId, featureIdsA).key
      ).toBe(FeaturesCacheEntries.userFeatureStates(userId, featureIdsB).key);
    });
  });

  describe("getUserAutoOptIn", () => {
    const userId = 111;

    it("should call repository on cache miss and cache the result", async () => {
      spyRepository.mockUserAutoOptIn[userId] = true;

      const result = await cachedRepository.getUserAutoOptIn(userId);

      expect(result).toBe(true);
      expect(spyRepository.getUserAutoOptInCalls).toEqual([userId]);
      expect(mockRedis.setCalls).toHaveLength(1);
    });

    it("should return cached value on cache hit without calling repository", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.userAutoOptIn(userId).key,
        false
      );

      const result = await cachedRepository.getUserAutoOptIn(userId);

      expect(result).toBe(false);
      expect(spyRepository.getUserAutoOptInCalls).toHaveLength(0);
    });
  });

  describe("checkIfTeamHasFeature", () => {
    const teamId = 222;
    const slug = "webhooks" as FeatureId;

    it("should always delegate to repository (no caching for single feature checks)", async () => {
      spyRepository.mockTeamHasFeature[`${teamId}:${slug}`] = true;

      const result1 = await cachedRepository.checkIfTeamHasFeature(
        teamId,
        slug
      );
      const result2 = await cachedRepository.checkIfTeamHasFeature(
        teamId,
        slug
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(spyRepository.checkIfTeamHasFeatureCalls).toHaveLength(2);
      expect(mockRedis.getCalls).toHaveLength(0);
      expect(mockRedis.setCalls).toHaveLength(0);
    });
  });

  describe("getTeamsFeatureStates", () => {
    const teamIds = [1, 2, 3];
    const featureIds = ["workflows", "organizations"] as FeatureId[];

    it("should return all from cache on full cache hit", async () => {
      // Cache key now includes featureIds - each team has its own cache entry
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamFeatureStates(1, featureIds).key,
        {
          workflows: "enabled",
          organizations: "disabled",
        }
      );
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamFeatureStates(2, featureIds).key,
        {
          workflows: "disabled",
          organizations: "enabled",
        }
      );
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamFeatureStates(3, featureIds).key,
        {
          workflows: "inherit",
          organizations: "inherit",
        }
      );

      const result = await cachedRepository.getTeamsFeatureStates({
        teamIds,
        featureIds,
      });

      expect(result).toEqual({
        workflows: { 1: "enabled", 2: "disabled", 3: "inherit" },
        organizations: { 1: "disabled", 2: "enabled", 3: "inherit" },
      });
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(0);
    });

    it("should fetch missing teams from repository on partial cache hit", async () => {
      // Only team 1 is cached
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamFeatureStates(1, featureIds).key,
        {
          workflows: "enabled",
          organizations: "disabled",
        }
      );
      spyRepository.mockTeamsFeatureStates = {
        workflows: { 2: "disabled", 3: "inherit" },
        organizations: { 2: "enabled", 3: "inherit" },
      };

      const result = await cachedRepository.getTeamsFeatureStates({
        teamIds,
        featureIds,
      });

      expect(result).toEqual({
        workflows: { 1: "enabled", 2: "disabled", 3: "inherit" },
        organizations: { 1: "disabled", 2: "enabled", 3: "inherit" },
      });
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getTeamsFeatureStatesCalls[0].teamIds).toEqual([
        2, 3,
      ]);
    });

    it("should fetch all teams from repository on cache miss", async () => {
      spyRepository.mockTeamsFeatureStates = {
        workflows: { 1: "enabled", 2: "disabled", 3: "inherit" },
        organizations: { 1: "disabled", 2: "enabled", 3: "inherit" },
      };

      const result = await cachedRepository.getTeamsFeatureStates({
        teamIds,
        featureIds,
      });

      expect(result).toEqual({
        workflows: { 1: "enabled", 2: "disabled", 3: "inherit" },
        organizations: { 1: "disabled", 2: "enabled", 3: "inherit" },
      });
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getTeamsFeatureStatesCalls[0].teamIds).toEqual(
        teamIds
      );
    });

    it("should cache each team's result with composite key (teamId + featureIds)", async () => {
      spyRepository.mockTeamsFeatureStates = {
        workflows: { 1: "enabled", 2: "disabled" },
        organizations: { 1: "disabled", 2: "enabled" },
      };
      const twoTeamIds = [1, 2];

      await cachedRepository.getTeamsFeatureStates({
        teamIds: twoTeamIds,
        featureIds,
      });

      // Should cache each team separately
      expect(mockRedis.setCalls).toHaveLength(2);
      expect(mockRedis.setCalls.map((c) => c.key)).toContain(
        FeaturesCacheEntries.teamFeatureStates(1, featureIds).key
      );
      expect(mockRedis.setCalls.map((c) => c.key)).toContain(
        FeaturesCacheEntries.teamFeatureStates(2, featureIds).key
      );
    });
  });

  describe("getTeamsAutoOptIn", () => {
    const teamIds = [10, 20, 30];

    it("should return all from cache on full cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(10).key, true);
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamAutoOptIn(20).key,
        false
      );
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(30).key, true);

      const result = await cachedRepository.getTeamsAutoOptIn(teamIds);

      expect(result).toEqual({ 10: true, 20: false, 30: true });
      expect(spyRepository.getTeamsAutoOptInCalls).toHaveLength(0);
    });

    it("should fetch missing teams from repository on partial cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(10).key, true);
      spyRepository.mockTeamsAutoOptIn = { 20: false, 30: true };

      const result = await cachedRepository.getTeamsAutoOptIn(teamIds);

      expect(result).toEqual({ 10: true, 20: false, 30: true });
      expect(spyRepository.getTeamsAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.getTeamsAutoOptInCalls[0]).toEqual([20, 30]);
    });

    it("should fetch all teams from repository on cache miss", async () => {
      spyRepository.mockTeamsAutoOptIn = { 10: true, 20: false, 30: true };

      const result = await cachedRepository.getTeamsAutoOptIn(teamIds);

      expect(result).toEqual({ 10: true, 20: false, 30: true });
      expect(spyRepository.getTeamsAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.getTeamsAutoOptInCalls[0]).toEqual(teamIds);
    });
  });

  describe("setUserFeatureState", () => {
    const userId = 333;
    const featureId = "calendar-cache" as FeatureId;

    it("should call repository (no cache invalidation with composite keys)", async () => {
      await cachedRepository.setUserFeatureState({
        userId,
        featureId,
        state: "enabled",
        assignedBy: "test",
      });

      expect(spyRepository.setUserFeatureStateCalls).toHaveLength(1);
      expect(spyRepository.setUserFeatureStateCalls[0]).toEqual({
        userId,
        featureId,
        state: "enabled",
        assignedBy: "test",
      });
      // No cache invalidation - composite keys rely on TTL
      expect(mockRedis.delCalls).toHaveLength(0);
    });

    it("should handle inherit state", async () => {
      await cachedRepository.setUserFeatureState({
        userId,
        featureId,
        state: "inherit",
      });

      expect(spyRepository.setUserFeatureStateCalls).toHaveLength(1);
      expect(spyRepository.setUserFeatureStateCalls[0].state).toBe("inherit");
      // No cache invalidation - composite keys rely on TTL
      expect(mockRedis.delCalls).toHaveLength(0);
    });
  });

  describe("setTeamFeatureState", () => {
    const teamId = 444;
    const featureId = "calendar-cache-serve" as FeatureId;

    it("should call repository (no cache invalidation with composite keys)", async () => {
      await cachedRepository.setTeamFeatureState({
        teamId,
        featureId,
        state: "enabled",
        assignedBy: "test",
      });

      expect(spyRepository.setTeamFeatureStateCalls).toHaveLength(1);
      expect(spyRepository.setTeamFeatureStateCalls[0]).toEqual({
        teamId,
        featureId,
        state: "enabled",
        assignedBy: "test",
      });
      // No cache invalidation - composite keys rely on TTL
      expect(mockRedis.delCalls).toHaveLength(0);
    });
  });

  describe("setUserAutoOptIn", () => {
    const userId = 555;

    it("should call repository and invalidate user auto opt-in cache", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.userAutoOptIn(userId).key,
        false
      );

      await cachedRepository.setUserAutoOptIn(userId, true);

      expect(spyRepository.setUserAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.setUserAutoOptInCalls[0]).toEqual({
        userId,
        enabled: true,
      });
      expect(mockRedis.delCalls).toContain(
        FeaturesCacheEntries.userAutoOptIn(userId).key
      );
    });
  });

  describe("setTeamAutoOptIn", () => {
    const teamId = 666;

    it("should call repository and invalidate team auto opt-in cache", async () => {
      mockRedis.setStoreValue(
        FeaturesCacheEntries.teamAutoOptIn(teamId).key,
        false
      );

      await cachedRepository.setTeamAutoOptIn(teamId, true);

      expect(spyRepository.setTeamAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.setTeamAutoOptInCalls[0]).toEqual({
        teamId,
        enabled: true,
      });
      expect(mockRedis.delCalls).toContain(
        FeaturesCacheEntries.teamAutoOptIn(teamId).key
      );
    });
  });

  describe("cache TTL", () => {
    it("should use custom TTL when provided", async () => {
      const customTtl = 30000;
      const customCachedRepo = new CachedFeaturesRepository(
        spyRepository,
        mockRedis,
        {
          cacheTtlMs: customTtl,
        }
      );
      spyRepository.mockGlobalFeatureEnabled[
        "calendar-subscription-cache" as FeatureId
      ] = true;

      await customCachedRepo.checkIfFeatureIsEnabledGlobally(
        "calendar-subscription-cache" as FeatureId
      );

      expect(mockRedis.setCalls[0].ttl).toBe(customTtl);
    });

    it("should use default TTL when not provided", async () => {
      const defaultCachedRepo = new CachedFeaturesRepository(
        spyRepository,
        mockRedis
      );
      spyRepository.mockGlobalFeatureEnabled[
        "calendar-subscription-sync" as FeatureId
      ] = true;

      await defaultCachedRepo.checkIfFeatureIsEnabledGlobally(
        "calendar-subscription-sync" as FeatureId
      );

      expect(mockRedis.setCalls[0].ttl).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("cache key generation", () => {
    it("should generate unique keys for different users", async () => {
      spyRepository.mockUserAutoOptIn[1] = true;
      spyRepository.mockUserAutoOptIn[2] = false;

      await cachedRepository.getUserAutoOptIn(1);
      await cachedRepository.getUserAutoOptIn(2);

      expect(mockRedis.setCalls[0].key).toBe(
        FeaturesCacheEntries.userAutoOptIn(1).key
      );
      expect(mockRedis.setCalls[1].key).toBe(
        FeaturesCacheEntries.userAutoOptIn(2).key
      );
      expect(mockRedis.setCalls[0].key).not.toBe(mockRedis.setCalls[1].key);
    });

    it("should generate unique keys for different features", async () => {
      spyRepository.mockGlobalFeatureEnabled["booking-audit" as FeatureId] =
        true;
      spyRepository.mockGlobalFeatureEnabled["bookings-v3" as FeatureId] =
        false;

      await cachedRepository.checkIfFeatureIsEnabledGlobally(
        "booking-audit" as FeatureId
      );
      await cachedRepository.checkIfFeatureIsEnabledGlobally(
        "bookings-v3" as FeatureId
      );

      expect(mockRedis.setCalls[0].key).not.toBe(mockRedis.setCalls[1].key);
    });
  });
});
