import { beforeEach, describe, expect, it } from "vitest";

import type { Feature } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "../config";
import { FeaturesCacheEntries } from "../features-cache-keys";
import type { IFeaturesRepository } from "../features.repository.interface";

import type { IRedisService } from "../../redis/IRedisService";

import { CachedFeaturesRepository } from "../cached-features.repository";

/**
 * In-memory mock Redis service for testing cache behavior.
 * Tracks all operations for verification.
 */
class MockRedisService implements IRedisService {
  private store = new Map<string, unknown>();

  getCalls: string[] = [];
  setCalls: Array<{ key: string; value: unknown; ttl?: number }> = [];
  delCalls: string[] = [];

  async get<TData>(key: string): Promise<TData | null> {
    this.getCalls.push(key);
    const value = this.store.get(key);
    return value !== undefined ? (value as TData) : null;
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK"> {
    this.setCalls.push({ key, value, ttl: opts?.ttl });
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    this.delCalls.push(key);
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async expire(_key: string, _seconds: number): Promise<0 | 1> {
    return 0;
  }

  async lrange<TResult = string>(_key: string, _start: number, _end: number): Promise<TResult[]> {
    return [];
  }

  async lpush<TData>(_key: string, ..._elements: TData[]): Promise<number> {
    return 0;
  }

  setStoreValue(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}

/**
 * Mock FeaturesRepository that tracks all method calls.
 */
class SpyFeaturesRepository implements IFeaturesRepository {
  getAllFeaturesCalls = 0;
  checkIfFeatureIsEnabledGloballyCalls: FeatureId[] = [];
  getTeamsWithFeatureEnabledCalls: FeatureId[] = [];
  checkIfUserHasFeatureCalls: Array<{ userId: number; slug: string }> = [];
  checkIfUserHasFeatureNonHierarchicalCalls: Array<{ userId: number; slug: string }> = [];
  getUserFeatureStatesCalls: Array<{ userId: number; featureIds: FeatureId[] }> = [];
  getUserAutoOptInCalls: number[] = [];
  checkIfTeamHasFeatureCalls: Array<{ teamId: number; slug: FeatureId }> = [];
  getTeamsFeatureStatesCalls: Array<{ teamIds: number[]; featureIds: FeatureId[] }> = [];
  getTeamsAutoOptInCalls: number[][] = [];
  setUserFeatureStateCalls: Array<{
    userId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy?: string;
  }> = [];
  setTeamFeatureStateCalls: Array<{
    teamId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy?: string;
  }> = [];
  setUserAutoOptInCalls: Array<{ userId: number; enabled: boolean }> = [];
  setTeamAutoOptInCalls: Array<{ teamId: number; enabled: boolean }> = [];

  mockAllFeatures: Feature[] = [];
  mockGlobalFeatureEnabled: Record<string, boolean> = {};
  mockTeamsWithFeature: Record<string, number[]> = {};
  mockUserHasFeature: Record<string, boolean> = {};
  mockUserHasFeatureNonHierarchical: Record<string, boolean> = {};
  mockUserFeatureStates: Record<number, Record<string, FeatureState>> = {};
  mockUserAutoOptIn: Record<number, boolean> = {};
  mockTeamHasFeature: Record<string, boolean> = {};
  mockTeamsFeatureStates: Record<string, Record<number, FeatureState>> = {};
  mockTeamsAutoOptIn: Record<number, boolean> = {};

  async getAllFeatures(): Promise<Feature[]> {
    this.getAllFeaturesCalls++;
    return this.mockAllFeatures;
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    this.checkIfFeatureIsEnabledGloballyCalls.push(slug);
    return this.mockGlobalFeatureEnabled[slug] ?? false;
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    this.getTeamsWithFeatureEnabledCalls.push(slug);
    return this.mockTeamsWithFeature[slug] ?? [];
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    this.checkIfUserHasFeatureCalls.push({ userId, slug });
    return this.mockUserHasFeature[`${userId}:${slug}`] ?? false;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    this.checkIfUserHasFeatureNonHierarchicalCalls.push({ userId, slug });
    return this.mockUserHasFeatureNonHierarchical[`${userId}:${slug}`] ?? false;
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    this.getUserFeatureStatesCalls.push(input);
    const userStates = this.mockUserFeatureStates[input.userId] ?? {};
    const result: Record<string, FeatureState> = {};
    for (const featureId of input.featureIds) {
      result[featureId] = userStates[featureId] ?? "inherit";
    }
    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    this.getUserAutoOptInCalls.push(userId);
    return this.mockUserAutoOptIn[userId] ?? false;
  }

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    this.checkIfTeamHasFeatureCalls.push({ teamId, slug });
    return this.mockTeamHasFeature[`${teamId}:${slug}`] ?? false;
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    this.getTeamsFeatureStatesCalls.push(input);
    const result: Record<string, Record<number, FeatureState>> = {};
    for (const featureId of input.featureIds) {
      result[featureId] = {};
      const featureStates = this.mockTeamsFeatureStates[featureId] ?? {};
      for (const teamId of input.teamIds) {
        if (featureStates[teamId] !== undefined) {
          result[featureId][teamId] = featureStates[teamId];
        }
      }
    }
    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    this.getTeamsAutoOptInCalls.push(teamIds);
    const result: Record<number, boolean> = {};
    for (const teamId of teamIds) {
      if (this.mockTeamsAutoOptIn[teamId] !== undefined) {
        result[teamId] = this.mockTeamsAutoOptIn[teamId];
      }
    }
    return result;
  }

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    this.setUserFeatureStateCalls.push({
      userId: input.userId,
      featureId: input.featureId,
      state: input.state,
      assignedBy: "assignedBy" in input ? input.assignedBy : undefined,
    });
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    this.setTeamFeatureStateCalls.push({
      teamId: input.teamId,
      featureId: input.featureId,
      state: input.state,
      assignedBy: "assignedBy" in input ? input.assignedBy : undefined,
    });
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    this.setUserAutoOptInCalls.push({ userId, enabled });
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    this.setTeamAutoOptInCalls.push({ teamId, enabled });
  }

  reset(): void {
    this.getAllFeaturesCalls = 0;
    this.checkIfFeatureIsEnabledGloballyCalls = [];
    this.getTeamsWithFeatureEnabledCalls = [];
    this.checkIfUserHasFeatureCalls = [];
    this.checkIfUserHasFeatureNonHierarchicalCalls = [];
    this.getUserFeatureStatesCalls = [];
    this.getUserAutoOptInCalls = [];
    this.checkIfTeamHasFeatureCalls = [];
    this.getTeamsFeatureStatesCalls = [];
    this.getTeamsAutoOptInCalls = [];
    this.setUserFeatureStateCalls = [];
    this.setTeamFeatureStateCalls = [];
    this.setUserAutoOptInCalls = [];
    this.setTeamAutoOptInCalls = [];
  }
}

describe("CachedFeaturesRepository", () => {
  let mockRedis: MockRedisService;
  let spyRepository: SpyFeaturesRepository;
  let cachedRepository: CachedFeaturesRepository;

  beforeEach(() => {
    mockRedis = new MockRedisService();
    spyRepository = new SpyFeaturesRepository();
    cachedRepository = new CachedFeaturesRepository(spyRepository, mockRedis, { cacheTtlMs: 60000 });
  });

  describe("getAllFeatures", () => {
    it("should call repository on cache miss and cache the result", async () => {
      const mockFeatures: Feature[] = [
        {
          slug: "feature-1",
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
      expect(mockRedis.setCalls[0].key).toBe(FeaturesCacheEntries.allFeatures().key);
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
      mockRedis.setStoreValue(FeaturesCacheEntries.allFeatures().key, cachedFeatures);

      const result = await cachedRepository.getAllFeatures();

      expect(result).toEqual(cachedFeatures);
      expect(spyRepository.getAllFeaturesCalls).toBe(0);
    });

    it("should delete invalid cache data and fetch from repository", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.allFeatures().key, "invalid-data");
      const mockFeatures: Feature[] = [];
      spyRepository.mockAllFeatures = mockFeatures;

      const result = await cachedRepository.getAllFeatures();

      expect(result).toEqual(mockFeatures);
      expect(spyRepository.getAllFeaturesCalls).toBe(1);
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.allFeatures().key);
    });
  });

  describe("checkIfFeatureIsEnabledGlobally", () => {
    const testSlug = "test-feature" as FeatureId;

    it("should call repository on cache miss and cache the result", async () => {
      spyRepository.mockGlobalFeatureEnabled[testSlug] = true;

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(testSlug);

      expect(result).toBe(true);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toEqual([testSlug]);
      expect(mockRedis.setCalls).toHaveLength(1);
      expect(mockRedis.setCalls[0].key).toBe(FeaturesCacheEntries.globalFeature(testSlug).key);
      expect(mockRedis.setCalls[0].value).toBe(true);
    });

    it("should return cached value on cache hit without calling repository", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.globalFeature(testSlug).key, false);

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(testSlug);

      expect(result).toBe(false);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toHaveLength(0);
    });

    it("should handle cached false value correctly (not treat as cache miss)", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.globalFeature(testSlug).key, false);
      spyRepository.mockGlobalFeatureEnabled[testSlug] = true;

      const result = await cachedRepository.checkIfFeatureIsEnabledGlobally(testSlug);

      expect(result).toBe(false);
      expect(spyRepository.checkIfFeatureIsEnabledGloballyCalls).toHaveLength(0);
    });
  });

  describe("getTeamsWithFeatureEnabled", () => {
    const testSlug = "teams-feature" as FeatureId;

    it("should call repository on cache miss and cache the result", async () => {
      spyRepository.mockTeamsWithFeature[testSlug] = [1, 2, 3];

      const result = await cachedRepository.getTeamsWithFeatureEnabled(testSlug);

      expect(result).toEqual([1, 2, 3]);
      expect(spyRepository.getTeamsWithFeatureEnabledCalls).toEqual([testSlug]);
      expect(mockRedis.setCalls).toHaveLength(1);
    });

    it("should return cached value on cache hit without calling repository", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamsWithFeatureEnabled(testSlug).key, [4, 5]);

      const result = await cachedRepository.getTeamsWithFeatureEnabled(testSlug);

      expect(result).toEqual([4, 5]);
      expect(spyRepository.getTeamsWithFeatureEnabledCalls).toHaveLength(0);
    });
  });

  describe("checkIfUserHasFeature", () => {
    it("should always delegate to repository (no caching)", async () => {
      const userId = 123;
      const slug = "user-feature";
      spyRepository.mockUserHasFeature[`${userId}:${slug}`] = true;

      const result1 = await cachedRepository.checkIfUserHasFeature(userId, slug);
      const result2 = await cachedRepository.checkIfUserHasFeature(userId, slug);

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

    it("should return true from cache when user state is enabled", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        [slug]: "enabled",
      });

      const result = await cachedRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);

      expect(result).toBe(true);
      expect(spyRepository.checkIfUserHasFeatureNonHierarchicalCalls).toHaveLength(0);
    });

    it("should return false from cache when user state is disabled", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        [slug]: "disabled",
      });

      const result = await cachedRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);

      expect(result).toBe(false);
      expect(spyRepository.checkIfUserHasFeatureNonHierarchicalCalls).toHaveLength(0);
    });

    it("should delegate to repository when user state is inherit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        [slug]: "inherit",
      });
      spyRepository.mockUserHasFeatureNonHierarchical[`${userId}:${slug}`] = true;

      const result = await cachedRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);

      expect(result).toBe(true);
      expect(spyRepository.checkIfUserHasFeatureNonHierarchicalCalls).toHaveLength(1);
    });

    it("should delegate to repository on cache miss", async () => {
      spyRepository.mockUserHasFeatureNonHierarchical[`${userId}:${slug}`] = false;

      const result = await cachedRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);

      expect(result).toBe(false);
      expect(spyRepository.checkIfUserHasFeatureNonHierarchicalCalls).toHaveLength(1);
    });
  });

  describe("getUserFeatureStates", () => {
    const userId = 789;
    const featureIds = ["feature-a", "feature-b", "feature-c"] as FeatureId[];

    it("should return all from cache on full cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        "feature-a": "enabled",
        "feature-b": "disabled",
        "feature-c": "inherit",
      });

      const result = await cachedRepository.getUserFeatureStates({ userId, featureIds });

      expect(result).toEqual({
        "feature-a": "enabled",
        "feature-b": "disabled",
        "feature-c": "inherit",
      });
      expect(spyRepository.getUserFeatureStatesCalls).toHaveLength(0);
    });

    it("should fetch missing features from repository on partial cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        "feature-a": "enabled",
      });
      spyRepository.mockUserFeatureStates[userId] = {
        "feature-b": "disabled",
        "feature-c": "inherit",
      };

      const result = await cachedRepository.getUserFeatureStates({ userId, featureIds });

      expect(result).toEqual({
        "feature-a": "enabled",
        "feature-b": "disabled",
        "feature-c": "inherit",
      });
      expect(spyRepository.getUserFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getUserFeatureStatesCalls[0].featureIds).toEqual(["feature-b", "feature-c"]);
    });

    it("should fetch all features from repository on cache miss", async () => {
      spyRepository.mockUserFeatureStates[userId] = {
        "feature-a": "enabled",
        "feature-b": "disabled",
        "feature-c": "inherit",
      };

      const result = await cachedRepository.getUserFeatureStates({ userId, featureIds });

      expect(result).toEqual({
        "feature-a": "enabled",
        "feature-b": "disabled",
        "feature-c": "inherit",
      });
      expect(spyRepository.getUserFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getUserFeatureStatesCalls[0].featureIds).toEqual(featureIds);
    });

    it("should update cache with fetched data", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        "feature-a": "enabled",
      });
      spyRepository.mockUserFeatureStates[userId] = {
        "feature-b": "disabled",
      };

      await cachedRepository.getUserFeatureStates({ userId, featureIds: ["feature-a", "feature-b"] as FeatureId[] });

      expect(mockRedis.setCalls).toHaveLength(1);
      expect(mockRedis.setCalls[0].value).toEqual({
        "feature-a": "enabled",
        "feature-b": "disabled",
      });
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
      mockRedis.setStoreValue(FeaturesCacheEntries.userAutoOptIn(userId).key, false);

      const result = await cachedRepository.getUserAutoOptIn(userId);

      expect(result).toBe(false);
      expect(spyRepository.getUserAutoOptInCalls).toHaveLength(0);
    });
  });

  describe("checkIfTeamHasFeature", () => {
    const teamId = 222;
    const slug = "team-feature" as FeatureId;

    it("should return true from cache when team state is enabled", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(teamId).key, {
        [slug]: "enabled",
      });

      const result = await cachedRepository.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(true);
      expect(spyRepository.checkIfTeamHasFeatureCalls).toHaveLength(0);
    });

    it("should delegate to repository when team state is not enabled", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(teamId).key, {
        [slug]: "disabled",
      });
      spyRepository.mockTeamHasFeature[`${teamId}:${slug}`] = false;

      const result = await cachedRepository.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(false);
      expect(spyRepository.checkIfTeamHasFeatureCalls).toHaveLength(1);
    });

    it("should delegate to repository on cache miss", async () => {
      spyRepository.mockTeamHasFeature[`${teamId}:${slug}`] = true;

      const result = await cachedRepository.checkIfTeamHasFeature(teamId, slug);

      expect(result).toBe(true);
      expect(spyRepository.checkIfTeamHasFeatureCalls).toHaveLength(1);
    });
  });

  describe("getTeamsFeatureStates", () => {
    const teamIds = [1, 2, 3];
    const featureIds = ["feat-x", "feat-y"] as FeatureId[];

    it("should return all from cache on full cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(1).key, {
        "feat-x": "enabled",
        "feat-y": "disabled",
      });
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(2).key, {
        "feat-x": "disabled",
        "feat-y": "enabled",
      });
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(3).key, {
        "feat-x": "inherit",
        "feat-y": "inherit",
      });

      const result = await cachedRepository.getTeamsFeatureStates({ teamIds, featureIds });

      expect(result).toEqual({
        "feat-x": { 1: "enabled", 2: "disabled", 3: "inherit" },
        "feat-y": { 1: "disabled", 2: "enabled", 3: "inherit" },
      });
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(0);
    });

    it("should fetch missing teams from repository on partial cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(1).key, {
        "feat-x": "enabled",
        "feat-y": "disabled",
      });
      spyRepository.mockTeamsFeatureStates = {
        "feat-x": { 2: "disabled", 3: "inherit" },
        "feat-y": { 2: "enabled", 3: "inherit" },
      };

      const result = await cachedRepository.getTeamsFeatureStates({ teamIds, featureIds });

      expect(result).toEqual({
        "feat-x": { 1: "enabled", 2: "disabled", 3: "inherit" },
        "feat-y": { 1: "disabled", 2: "enabled", 3: "inherit" },
      });
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getTeamsFeatureStatesCalls[0].teamIds).toEqual([2, 3]);
    });

    it("should fetch teams with partial feature coverage from repository", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(1).key, {
        "feat-x": "enabled",
      });
      spyRepository.mockTeamsFeatureStates = {
        "feat-x": { 2: "disabled", 3: "inherit" },
        "feat-y": { 1: "disabled", 2: "enabled", 3: "inherit" },
      };

      const result = await cachedRepository.getTeamsFeatureStates({ teamIds, featureIds });

      expect(result["feat-x"][1]).toBe("enabled");
      expect(spyRepository.getTeamsFeatureStatesCalls).toHaveLength(1);
      expect(spyRepository.getTeamsFeatureStatesCalls[0].teamIds).toContain(1);
    });
  });

  describe("getTeamsAutoOptIn", () => {
    const teamIds = [10, 20, 30];

    it("should return all from cache on full cache hit", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(10).key, true);
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(20).key, false);
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
    const featureId = "mut-feature" as FeatureId;

    it("should call repository and invalidate user cache", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userFeatureStates(userId).key, {
        [featureId]: "disabled",
      });

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
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.userFeatureStates(userId).key);
    });

    it("should handle inherit state", async () => {
      await cachedRepository.setUserFeatureState({
        userId,
        featureId,
        state: "inherit",
      });

      expect(spyRepository.setUserFeatureStateCalls).toHaveLength(1);
      expect(spyRepository.setUserFeatureStateCalls[0].state).toBe("inherit");
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.userFeatureStates(userId).key);
    });
  });

  describe("setTeamFeatureState", () => {
    const teamId = 444;
    const featureId = "team-mut-feature" as FeatureId;

    it("should call repository and invalidate team cache", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamFeatureStates(teamId).key, {
        [featureId]: "disabled",
      });

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
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.teamFeatureStates(teamId).key);
    });
  });

  describe("setUserAutoOptIn", () => {
    const userId = 555;

    it("should call repository and invalidate user auto opt-in cache", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.userAutoOptIn(userId).key, false);

      await cachedRepository.setUserAutoOptIn(userId, true);

      expect(spyRepository.setUserAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.setUserAutoOptInCalls[0]).toEqual({ userId, enabled: true });
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.userAutoOptIn(userId).key);
    });
  });

  describe("setTeamAutoOptIn", () => {
    const teamId = 666;

    it("should call repository and invalidate team auto opt-in cache", async () => {
      mockRedis.setStoreValue(FeaturesCacheEntries.teamAutoOptIn(teamId).key, false);

      await cachedRepository.setTeamAutoOptIn(teamId, true);

      expect(spyRepository.setTeamAutoOptInCalls).toHaveLength(1);
      expect(spyRepository.setTeamAutoOptInCalls[0]).toEqual({ teamId, enabled: true });
      expect(mockRedis.delCalls).toContain(FeaturesCacheEntries.teamAutoOptIn(teamId).key);
    });
  });

  describe("cache TTL", () => {
    it("should use custom TTL when provided", async () => {
      const customTtl = 30000;
      const customCachedRepo = new CachedFeaturesRepository(spyRepository, mockRedis, { cacheTtlMs: customTtl });
      spyRepository.mockGlobalFeatureEnabled["ttl-test" as FeatureId] = true;

      await customCachedRepo.checkIfFeatureIsEnabledGlobally("ttl-test" as FeatureId);

      expect(mockRedis.setCalls[0].ttl).toBe(customTtl);
    });

    it("should use default TTL when not provided", async () => {
      const defaultCachedRepo = new CachedFeaturesRepository(spyRepository, mockRedis);
      spyRepository.mockGlobalFeatureEnabled["default-ttl" as FeatureId] = true;

      await defaultCachedRepo.checkIfFeatureIsEnabledGlobally("default-ttl" as FeatureId);

      expect(mockRedis.setCalls[0].ttl).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("cache key generation", () => {
    it("should generate unique keys for different users", async () => {
      spyRepository.mockUserAutoOptIn[1] = true;
      spyRepository.mockUserAutoOptIn[2] = false;

      await cachedRepository.getUserAutoOptIn(1);
      await cachedRepository.getUserAutoOptIn(2);

      expect(mockRedis.setCalls[0].key).toBe(FeaturesCacheEntries.userAutoOptIn(1).key);
      expect(mockRedis.setCalls[1].key).toBe(FeaturesCacheEntries.userAutoOptIn(2).key);
      expect(mockRedis.setCalls[0].key).not.toBe(mockRedis.setCalls[1].key);
    });

    it("should generate unique keys for different features", async () => {
      spyRepository.mockGlobalFeatureEnabled["feature-1" as FeatureId] = true;
      spyRepository.mockGlobalFeatureEnabled["feature-2" as FeatureId] = false;

      await cachedRepository.checkIfFeatureIsEnabledGlobally("feature-1" as FeatureId);
      await cachedRepository.checkIfFeatureIsEnabledGlobally("feature-2" as FeatureId);

      expect(mockRedis.setCalls[0].key).not.toBe(mockRedis.setCalls[1].key);
    });
  });
});
