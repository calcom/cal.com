import type { IRedisService } from "@calcom/features/redis/IRedisService";

import type { FeatureId, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import { type CacheEntry, FeaturesCacheEntries as KEYS } from "./features-cache-keys";

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Caching proxy for FeaturesRepository using composite keys.
 *
 * Strategy:
 * - Composite keys for batch methods: userId/teamId + featureIds (e.g., features:userFeatureStates:123:featureA,featureB)
 * - Full cache hit or miss: No partial cache merging, simpler logic
 * - TTL-only invalidation for feature states: Mutations don't invalidate composite key caches
 * - Per-entity caches for autoOptIn: Simple keys with exact invalidation on mutation
 * - Type-safe caching: Each cache key is paired with its Zod schema for validation
 *
 * Benefits:
 * - Simpler caching logic without partial cache merging
 * - Predictable cache behavior (full hit or full miss)
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
  private async getValue<T>(entry: CacheEntry<T>): Promise<T | null> {
    const cached = await this.redisService.get<unknown>(entry.key);
    if (cached === null) {
      return null;
    }
    const parsed = entry.schema.safeParse(cached);
    if (parsed.success) {
      return parsed.data;
    }
    await this.redisService.del(entry.key);
    return null;
  }

  /**
   * Set a value in cache using a typed cache entry.
   */
  private async setValue<T>(entry: CacheEntry<T>, value: T): Promise<void> {
    await this.redisService.set(entry.key, value, { ttl: this.cacheTtlMs });
  }

  /**
   * Delete a cache entry.
   */
  private async del<T>(entry: CacheEntry<T>): Promise<void> {
    await this.redisService.del(entry.key);
  }

  /**
   * Get or fetch pattern: check cache, fetch if miss, store result.
   */
  private async withCache<T>(entry: CacheEntry<T>, fetchData: () => Promise<T>): Promise<T> {
    const cached = await this.getValue(entry);
    if (cached !== null) {
      return cached;
    }
    const result = await fetchData();
    await this.setValue(entry, result);
    return result;
  }

  // === TTL-only caches (global data, no explicit invalidation) ===

  async getAllFeatures() {
    return this.withCache(KEYS.allFeatures(), () => this.featuresRepository.getAllFeatures());
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    return this.withCache(KEYS.globalFeature(slug), () =>
      this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug)
    );
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    return this.withCache(KEYS.teamsWithFeatureEnabled(slug), () =>
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
    // Delegate to repository - single feature checks are not cached
    // since composite keys (userId + featureIds) don't support single-feature lookups efficiently
    return this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
  }

  async getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>> {
    // Delegate to repository - this method returns boolean status, not FeatureState
    return this.featuresRepository.getUserFeaturesStatus(userId, slugs);
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    return this.withCache(KEYS.userFeatureStates(input.userId, input.featureIds), () =>
      this.featuresRepository.getUserFeatureStates(input)
    );
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    return this.withCache(KEYS.userAutoOptIn(userId), () => this.featuresRepository.getUserAutoOptIn(userId));
  }

  // === Per-team caches ===

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    // Delegate to repository - single feature checks are not cached
    // since composite keys (teamId + featureIds) don't support single-feature lookups efficiently
    return this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    // Fetch cached states for each team in parallel
    const teamStatesMap = await Promise.all(
      input.teamIds.map(async (teamId) => ({
        teamId,
        states: await this.getValue(KEYS.teamFeatureStates(teamId, input.featureIds)),
      }))
    );

    // Separate cache hits from misses
    const cachedTeams: { teamId: number; states: Record<string, FeatureState> }[] = [];
    const teamsNeedingFetch: number[] = [];

    for (const { teamId, states } of teamStatesMap) {
      if (states !== null) {
        cachedTeams.push({ teamId, states });
      } else {
        teamsNeedingFetch.push(teamId);
      }
    }

    // Fetch missing teams from repository
    let freshStates: Record<string, Record<number, FeatureState>> = {};
    if (teamsNeedingFetch.length > 0) {
      freshStates = await this.featuresRepository.getTeamsFeatureStates({
        teamIds: teamsNeedingFetch,
        featureIds: input.featureIds,
      });

      // Cache the fresh results per team
      for (const teamId of teamsNeedingFetch) {
        const teamStates: Record<string, FeatureState> = {};
        for (const featureId of input.featureIds) {
          if (freshStates[featureId]?.[teamId] !== undefined) {
            teamStates[featureId] = freshStates[featureId][teamId];
          }
        }
        await this.setValue(KEYS.teamFeatureStates(teamId, input.featureIds), teamStates);
      }
    }

    // Compose the final result from cached and fresh data
    const result: Record<string, Record<number, FeatureState>> = {};
    for (const featureId of input.featureIds) {
      result[featureId] = {};
    }

    // Add cached team states
    for (const { teamId, states } of cachedTeams) {
      for (const featureId of input.featureIds) {
        if (states[featureId] !== undefined) {
          result[featureId][teamId] = states[featureId];
        }
      }
    }

    // Add fresh team states
    for (const featureId of input.featureIds) {
      if (freshStates[featureId]) {
        Object.assign(result[featureId], freshStates[featureId]);
      }
    }

    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    const results = await Promise.all(
      teamIds.map(async (teamId) => ({
        teamId,
        cached: await this.getValue(KEYS.teamAutoOptIn(teamId)),
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
        await this.setValue(KEYS.teamAutoOptIn(teamId), value);
      }
    }

    return result;
  }

  // === Mutations ===
  // Note: Feature state caches use composite keys (userId/teamId + featureIds),
  // so we cannot easily invalidate all cached combinations on mutation.
  // These caches rely on TTL for eventual consistency.

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setUserFeatureState(input);
    // No cache invalidation - composite keys rely on TTL
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setTeamFeatureState(input);
    // No cache invalidation - composite keys rely on TTL
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setUserAutoOptIn(userId, enabled);
    await this.del(KEYS.userAutoOptIn(userId));
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setTeamAutoOptIn(teamId, enabled);
    await this.del(KEYS.teamAutoOptIn(teamId));
  }
}
