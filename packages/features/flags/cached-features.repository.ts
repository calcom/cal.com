import type { IRedisService } from "@calcom/features/redis/IRedisService";
import type { Feature } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import { type CacheEntry, FeaturesCacheEntries as KEYS } from "./features-cache-keys";

const DEFAULT_CACHE_TTL_MS: number = 24 * 60 * 60 * 1000; // 24 hours

export type CachedFeaturesRepositoryDeps = {
  featuresRepository: IFeaturesRepository;
  redisService: IRedisService;
  options?: { cacheTtlMs?: number };
};

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
  private readonly featuresRepository: IFeaturesRepository;
  private readonly redisService: IRedisService;
  private readonly cacheTtlMs: number;

  constructor(deps: CachedFeaturesRepositoryDeps) {
    this.featuresRepository = deps.featuresRepository;
    this.redisService = deps.redisService;
    this.cacheTtlMs = deps.options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
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
   * Validates the value against the schema before storing.
   * Throws an error if validation fails to prevent storing invalid data.
   */
  private async setValue<T>(entry: CacheEntry<T>, value: T): Promise<void> {
    const parsed = entry.schema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Invalid cache value for key ${entry.key}: ${parsed.error.message}`);
    }
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

  private async resolveTeamsCache<TCache, TFresh>({
    teamIds,
    getEntry,
    fetchMissing,
    mapFreshToCacheValue,
  }: {
    teamIds: number[];
    getEntry: (teamId: number) => CacheEntry<TCache>;
    fetchMissing: (missingTeamIds: number[]) => Promise<TFresh>;
    mapFreshToCacheValue: (fresh: TFresh, teamId: number) => TCache | undefined;
  }): Promise<{ cached: Map<number, TCache>; fresh: TFresh }> {
    const cachedResults = await Promise.all(
      teamIds.map(async (teamId) => ({
        teamId,
        value: await this.getValue(getEntry(teamId)),
      }))
    );

    const cached = new Map<number, TCache>();
    const missing: number[] = [];

    for (const { teamId, value } of cachedResults) {
      if (value !== null) {
        cached.set(teamId, value);
      } else {
        missing.push(teamId);
      }
    }

    let fresh = {} as TFresh;

    if (missing.length > 0) {
      fresh = await fetchMissing(missing);
      const writes: Promise<void>[] = [];
      for (const teamId of missing) {
        const value = mapFreshToCacheValue(fresh, teamId);
        if (value !== undefined) {
          writes.push(this.setValue(getEntry(teamId), value));
        }
      }
      await Promise.all(writes);
    }

    return { cached, fresh };
  }

  // === TTL-only caches (global data, no explicit invalidation) ===

  async getAllFeatures(): Promise<Feature[]> {
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
  }): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>> {
    const { teamIds, featureIds } = input;
    const { cached, fresh } = await this.resolveTeamsCache({
      teamIds,
      getEntry: (teamId: number) => KEYS.teamFeatureStates(teamId, featureIds),
      fetchMissing: (missingTeamIds: number[]) =>
        this.featuresRepository.getTeamsFeatureStates({
          teamIds: missingTeamIds,
          featureIds,
        }),
      mapFreshToCacheValue: (freshStates: Record<string, Record<number, FeatureState>>, teamId: number) => {
        const teamStates: Record<string, FeatureState> = {};
        for (const featureId of featureIds) {
          const state = freshStates[featureId]?.[teamId];
          if (state !== undefined) {
            teamStates[featureId] = state;
          }
        }
        return teamStates;
      },
    });
    const result = Object.fromEntries(featureIds.map((featureId) => [featureId, {}])) as Record<
      FeatureId,
      Record<number, FeatureState>
    >;
    cached.forEach((states, teamId) => {
      for (const featureId of featureIds) {
        const state = states[featureId];
        if (state !== undefined) {
          result[featureId][teamId] = state;
        }
      }
    });
    for (const featureId of featureIds) {
      const states = fresh[featureId];
      if (states) {
        Object.assign(result[featureId], states);
      }
    }
    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    const { cached, fresh } = await this.resolveTeamsCache({
      teamIds,
      getEntry: KEYS.teamAutoOptIn,
      fetchMissing: (missingTeamIds: number[]) => this.featuresRepository.getTeamsAutoOptIn(missingTeamIds),
      mapFreshToCacheValue: (freshResults: Record<number, boolean>, teamId: number) => freshResults[teamId],
    });
    const result: Record<number, boolean> = {};
    cached.forEach((value, teamId) => {
      result[teamId] = value;
    });
    Object.assign(result, fresh);
    return result;
  }

  // === Mutations ===
  // Note: Feature state caches use composite keys (userId/teamId + featureIds),
  // so we cannot easily invalidate all cached combinations on mutation.
  // These caches rely on TTL for eventual consistency.

  async setUserFeatureState(
    input:
      | {
          userId: number;
          featureId: FeatureId;
          state: "enabled" | "disabled";
          assignedBy: string;
        }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setUserFeatureState(input);
    // No cache invalidation - composite keys rely on TTL
  }

  async setTeamFeatureState(
    input:
      | {
          teamId: number;
          featureId: FeatureId;
          state: "enabled" | "disabled";
          assignedBy: string;
        }
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
