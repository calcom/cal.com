import type { IRedisService } from "@calcom/features/redis/IRedisService";

import type { FeatureId, FeatureState } from "./config";
import { FeaturesCacheKeys } from "./features-cache-keys";
import type { IFeaturesRepository } from "./features.repository.interface";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_COMPOSITION_THRESHOLD = 30; // Skip cache composition for large batches

/**
 * Caching proxy for FeaturesRepository using per-entity canonical caches.
 *
 * Strategy:
 * - Per-entity caches: Store canonical state per user/team, invalidate via exact DEL
 * - Batch composition: Batch methods fetch per-entity caches and compose results
 * - TTL-only for global data: No explicit invalidation, relies on TTL expiration
 *
 * Benefits:
 * - No cache buster needed (no extra Redis read per call)
 * - Simple invalidation via exact key deletion
 * - Batch methods benefit from per-entity cache hits
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

  private async withCache<T>(cacheKey: string, fetch: () => Promise<T>): Promise<T> {
    const cached = await this.redisService.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await fetch();
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  // === TTL-only caches (global data, no explicit invalidation) ===

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const cacheKey = FeaturesCacheKeys.globalFeature(slug);
    return this.withCache(cacheKey, () => this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug));
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    const cacheKey = FeaturesCacheKeys.teamsWithFeatureEnabled(slug);
    return this.withCache(cacheKey, () => this.featuresRepository.getTeamsWithFeatureEnabled(slug));
  }

  // === Per-user caches ===

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const userStates = await this.getUserFeatureStatesCanonical(userId);
    const state = userStates[slug];
    if (state !== undefined) {
      return state === "enabled";
    }
    return this.featuresRepository.checkIfUserHasFeature(userId, slug);
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const userStates = await this.getUserFeatureStatesCanonical(userId);
    const state = userStates[slug];
    if (state !== undefined) {
      return state === "enabled";
    }
    return this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    const userStates = await this.getUserFeatureStatesCanonical(input.userId);

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
    }

    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    const cacheKey = FeaturesCacheKeys.userAutoOptIn(userId);
    return this.withCache(cacheKey, () => this.featuresRepository.getUserAutoOptIn(userId));
  }

  // === Per-team caches ===

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    const teamStates = await this.getTeamFeatureStatesCanonical(teamId);
    const state = teamStates[slug];
    if (state !== undefined) {
      return state === "enabled";
    }
    return this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    if (input.teamIds.length > BATCH_COMPOSITION_THRESHOLD) {
      return this.featuresRepository.getTeamsFeatureStates(input);
    }

    const teamStatesMap = await Promise.all(
      input.teamIds.map(async (teamId) => ({
        teamId,
        states: await this.getTeamFeatureStatesCanonical(teamId),
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
      for (const featureId of input.featureIds) {
        if (freshStates[featureId]) {
          Object.assign(result[featureId], freshStates[featureId]);
        }
      }
    }

    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    if (teamIds.length > BATCH_COMPOSITION_THRESHOLD) {
      return this.featuresRepository.getTeamsAutoOptIn(teamIds);
    }

    const results = await Promise.all(
      teamIds.map(async (teamId) => {
        const cacheKey = FeaturesCacheKeys.teamAutoOptIn(teamId);
        const cached = await this.redisService.get<boolean>(cacheKey);
        return { teamId, cached };
      })
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
        const cacheKey = FeaturesCacheKeys.teamAutoOptIn(teamId);
        await this.redisService.set(cacheKey, value, { ttl: this.cacheTtlMs });
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
    await this.redisService.del(FeaturesCacheKeys.userFeatureStates(input.userId));
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setTeamFeatureState(input);
    await this.redisService.del(FeaturesCacheKeys.teamFeatureStates(input.teamId));
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setUserAutoOptIn(userId, enabled);
    await this.redisService.del(FeaturesCacheKeys.userAutoOptIn(userId));
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setTeamAutoOptIn(teamId, enabled);
    await this.redisService.del(FeaturesCacheKeys.teamAutoOptIn(teamId));
  }

  // === Private helpers for canonical per-entity caches ===

  private async getUserFeatureStatesCanonical(userId: number): Promise<Record<string, FeatureState>> {
    const cacheKey = FeaturesCacheKeys.userFeatureStates(userId);
    const cached = await this.redisService.get<Record<string, FeatureState>>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    return {};
  }

  private async getTeamFeatureStatesCanonical(teamId: number): Promise<Record<string, FeatureState>> {
    const cacheKey = FeaturesCacheKeys.teamFeatureStates(teamId);
    const cached = await this.redisService.get<Record<string, FeatureState>>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    return {};
  }
}
