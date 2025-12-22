import type { IRedisService } from "@calcom/features/redis/IRedisService";

import type { FeatureId, FeatureState } from "./config";
import { type CacheEntry, FeaturesCacheEntries } from "./features-cache-keys";
import type { IFeaturesRepository } from "./features.repository.interface";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Caching proxy for FeaturesRepository using per-entity canonical caches.
 *
 * Strategy:
 * - Per-entity caches: Store canonical state per user/team, invalidate via exact DEL
 * - Batch composition: Batch methods fetch per-entity caches and compose results
 * - TTL-only for global data: No explicit invalidation, relies on TTL expiration
 * - Type-safe caching: Each cache key is paired with its Zod schema for validation
 *
 * Benefits:
 * - No cache buster needed (no extra Redis read per call)
 * - Simple invalidation via exact key deletion
 * - Batch methods benefit from per-entity cache hits
 * - Schema validation prevents returning corrupted cache data
 */
export class CachedFeaturesRepository implements IFeaturesRepository {
  private readonly cacheTtlMs: number;

  constructor(
    private readonly featuresRepository: IFeaturesRepository,
    private readonly redisService: IRedisService,
    options?: { cacheTtlMs?: number }
  ) {
    this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Get a value from cache using a typed cache entry.
   * Returns null if cache miss or validation fails (invalid data is deleted).
   */
  private async getValue<T, Args extends unknown[]>(entry: CacheEntry<T, Args>, ...args: Args): Promise<T | null> {
    const cacheKey = entry.key(...args);
    const cached = await this.redisService.get<unknown>(cacheKey);
    if (cached === null) {
      return null;
    }
    const parsed = entry.schema.safeParse(cached);
    if (parsed.success) {
      return parsed.data;
    }
    await this.redisService.del(cacheKey);
    return null;
  }

  /**
   * Set a value in cache using a typed cache entry.
   */
  private async setValue<T, Args extends unknown[]>(
    entry: CacheEntry<T, Args>,
    value: T,
    ...args: Args
  ): Promise<void> {
    const cacheKey = entry.key(...args);
    await this.redisService.set(cacheKey, value, { ttl: this.cacheTtlMs });
  }

  /**
   * Delete a cache entry.
   */
  private async del<T, Args extends unknown[]>(entry: CacheEntry<T, Args>, ...args: Args): Promise<void> {
    const cacheKey = entry.key(...args);
    await this.redisService.del(cacheKey);
  }

  /**
   * Get or fetch pattern: check cache, fetch if miss, store result.
   */
  private async withCache<T, Args extends unknown[]>(
    entry: CacheEntry<T, Args>,
    args: Args,
    fetch: () => Promise<T>
  ): Promise<T> {
    const cached = await this.getValue(entry, ...args);
    if (cached !== null) {
      return cached;
    }
    const result = await fetch();
    await this.setValue(entry, result, ...args);
    return result;
  }

  // === TTL-only caches (global data, no explicit invalidation) ===

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    return this.withCache(FeaturesCacheEntries.globalFeature, [slug], () =>
      this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug)
    );
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    return this.withCache(FeaturesCacheEntries.teamsWithFeatureEnabled, [slug], () =>
      this.featuresRepository.getTeamsWithFeatureEnabled(slug)
    );
  }

  // === Per-user caches ===

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    // Note: This method does hierarchical resolution (user → team → parent teams),
    // which cannot be cached using per-entity caches without cross-entity invalidation.
    // We delegate directly to the repository for correctness.
    return this.featuresRepository.checkIfUserHasFeature(userId, slug);
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const userStates = await this.getValue(FeaturesCacheEntries.userFeatureStates, userId);
    if (userStates) {
      const state = userStates[slug];
      if (state === "enabled") {
        return true;
      }
      if (state === "disabled") {
        return false;
      }
    }
    return this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    const userStates = (await this.getValue(FeaturesCacheEntries.userFeatureStates, input.userId)) ?? {};

    const result: Record<string, FeatureState> = {};
    const missingFeatureIds: FeatureId[] = [];

    for (const featureId of input.featureIds) {
      if (userStates[featureId] !== undefined) {
        result[featureId] = userStates[featureId];
      } else {
        missingFeatureIds.push(featureId);
      }
    }

    if (missingFeatureIds.length > 0) {
      const freshStates = await this.featuresRepository.getUserFeatureStates({
        userId: input.userId,
        featureIds: missingFeatureIds,
      });
      Object.assign(result, freshStates);

      const updatedCache = { ...userStates, ...freshStates };
      await this.setValue(FeaturesCacheEntries.userFeatureStates, updatedCache, input.userId);
    }

    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    return this.withCache(FeaturesCacheEntries.userAutoOptIn, [userId], () =>
      this.featuresRepository.getUserAutoOptIn(userId)
    );
  }

  // === Per-team caches ===

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    const teamStates = await this.getValue(FeaturesCacheEntries.teamFeatureStates, teamId);
    if (teamStates) {
      const state = teamStates[slug];
      if (state !== undefined) {
        return state === "enabled";
      }
    }
    return this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    const teamStatesMap = await Promise.all(
      input.teamIds.map(async (teamId) => ({
        teamId,
        states: (await this.getValue(FeaturesCacheEntries.teamFeatureStates, teamId)) ?? {},
      }))
    );

    const result: Record<string, Record<number, FeatureState>> = {};
    const teamsNeedingFetch: number[] = [];

    for (const featureId of input.featureIds) {
      result[featureId] = {};
    }

    for (const { teamId, states } of teamStatesMap) {
      let hasMissingFeature = false;
      for (const featureId of input.featureIds) {
        if (states[featureId] !== undefined) {
          result[featureId][teamId] = states[featureId];
        } else {
          hasMissingFeature = true;
        }
      }
      if (hasMissingFeature) {
        teamsNeedingFetch.push(teamId);
      }
    }

    if (teamsNeedingFetch.length > 0) {
      const freshStates = await this.featuresRepository.getTeamsFeatureStates({
        teamIds: teamsNeedingFetch,
        featureIds: input.featureIds,
      });

      const perTeamFreshStates: Record<number, Record<string, FeatureState>> = {};
      for (const featureId of input.featureIds) {
        if (freshStates[featureId]) {
          Object.assign(result[featureId], freshStates[featureId]);
          for (const [teamIdStr, state] of Object.entries(freshStates[featureId])) {
            const teamId = Number(teamIdStr);
            if (!perTeamFreshStates[teamId]) {
              perTeamFreshStates[teamId] = {};
            }
            perTeamFreshStates[teamId][featureId] = state;
          }
        }
      }

      const existingTeamStates = teamStatesMap.reduce(
        (acc, { teamId, states }) => {
          acc[teamId] = states;
          return acc;
        },
        {} as Record<number, Record<string, FeatureState>>
      );

      for (const teamId of teamsNeedingFetch) {
        const existingStates = existingTeamStates[teamId] || {};
        const freshTeamStates = perTeamFreshStates[teamId] || {};
        const updatedCache = { ...existingStates, ...freshTeamStates };
        await this.setValue(FeaturesCacheEntries.teamFeatureStates, updatedCache, teamId);
      }
    }

    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    const results = await Promise.all(
      teamIds.map(async (teamId) => ({
        teamId,
        cached: await this.getValue(FeaturesCacheEntries.teamAutoOptIn, teamId),
      }))
    );

    const result: Record<number, boolean> = {};
    const teamsNeedingFetch: number[] = [];

    for (const { teamId, cached } of results) {
      if (cached !== null) {
        result[teamId] = cached;
      } else {
        teamsNeedingFetch.push(teamId);
      }
    }

    if (teamsNeedingFetch.length > 0) {
      const freshResults = await this.featuresRepository.getTeamsAutoOptIn(teamsNeedingFetch);
      for (const [teamIdStr, value] of Object.entries(freshResults)) {
        const teamId = Number(teamIdStr);
        result[teamId] = value;
        await this.setValue(FeaturesCacheEntries.teamAutoOptIn, value, teamId);
      }
    }

    return result;
  }

  // === Mutations (invalidate per-entity caches) ===

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setUserFeatureState(input);
    await this.del(FeaturesCacheEntries.userFeatureStates, input.userId);
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setTeamFeatureState(input);
    await this.del(FeaturesCacheEntries.teamFeatureStates, input.teamId);
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setUserAutoOptIn(userId, enabled);
    await this.del(FeaturesCacheEntries.userAutoOptIn, userId);
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setTeamAutoOptIn(teamId, enabled);
    await this.del(FeaturesCacheEntries.teamAutoOptIn, teamId);
  }
}
