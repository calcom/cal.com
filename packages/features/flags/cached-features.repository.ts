import type { IRedisService } from "@calcom/features/redis/IRedisService";

import type { FeatureId, FeatureState } from "./config";
import { FeaturesCacheKeys, type VersionStamps } from "./features-cache-keys";
import type { IFeaturesRepository } from "./features.repository.interface";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CachedFeaturesRepository implements IFeaturesRepository {
  private readonly cacheTtlMs: number;

  constructor(
    private readonly featuresRepository: IFeaturesRepository,
    private readonly redisService: IRedisService,
    options?: { cacheTtlMs?: number }
  ) {
    this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  private async getVersionStamps(options?: {
    userId?: number;
    teamId?: number;
  }): Promise<VersionStamps> {
    const [global, access, user, team] = await Promise.all([
      this.redisService.get<string>(FeaturesCacheKeys.versionGlobal()),
      this.redisService.get<string>(FeaturesCacheKeys.versionAccess()),
      options?.userId
        ? this.redisService.get<string>(FeaturesCacheKeys.versionUser(options.userId))
        : Promise.resolve(null),
      options?.teamId
        ? this.redisService.get<string>(FeaturesCacheKeys.versionTeam(options.teamId))
        : Promise.resolve(null),
    ]);

    return {
      global: global ?? "0",
      access: access ?? "0",
      user: user ?? undefined,
      team: team ?? undefined,
    };
  }

  private async bumpVersion(key: string): Promise<void> {
    const newVersion = FeaturesCacheKeys.generateVersionStamp();
    await this.redisService.set(key, newVersion);
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const versions = await this.getVersionStamps();
    const cacheKey = FeaturesCacheKeys.globalFeature(versions, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const versions = await this.getVersionStamps({ userId });
    const cacheKey = FeaturesCacheKeys.userFeature(versions, userId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfUserHasFeature(userId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    const versions = await this.getVersionStamps({ userId });
    const cacheKey = FeaturesCacheKeys.userFeatureNonHierarchical(versions, userId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    const versions = await this.getVersionStamps({ teamId });
    const cacheKey = FeaturesCacheKeys.teamFeature(versions, teamId, slug);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.checkIfTeamHasFeature(teamId, slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    const versions = await this.getVersionStamps();
    const cacheKey = FeaturesCacheKeys.teamsWithFeatureEnabled(versions, slug);

    const cached = await this.redisService.get<number[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsWithFeatureEnabled(slug);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setUserFeatureState(input);
    await this.bumpVersion(FeaturesCacheKeys.versionUser(input.userId));
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    await this.featuresRepository.setTeamFeatureState(input);
    await Promise.all([
      this.bumpVersion(FeaturesCacheKeys.versionTeam(input.teamId)),
      this.bumpVersion(FeaturesCacheKeys.versionAccess()),
    ]);
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    const versions = await this.getVersionStamps({ userId: input.userId });
    const cacheKey = FeaturesCacheKeys.userFeatureStates(versions, input.userId, input.featureIds);

    const cached = await this.redisService.get<Record<string, FeatureState>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getUserFeatureStates(input);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    const versions = await this.getVersionStamps();
    const cacheKey = FeaturesCacheKeys.teamsFeatureStates(versions, input.teamIds, input.featureIds);

    const cached = await this.redisService.get<Record<string, Record<number, FeatureState>>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsFeatureStates(input);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    const versions = await this.getVersionStamps({ userId });
    const cacheKey = FeaturesCacheKeys.userAutoOptIn(versions, userId);

    const cached = await this.redisService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getUserAutoOptIn(userId);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    const versions = await this.getVersionStamps();
    const cacheKey = FeaturesCacheKeys.teamsAutoOptIn(versions, teamIds);

    const cached = await this.redisService.get<Record<number, boolean>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.featuresRepository.getTeamsAutoOptIn(teamIds);
    await this.redisService.set(cacheKey, result, { ttl: this.cacheTtlMs });
    return result;
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setUserAutoOptIn(userId, enabled);
    await this.bumpVersion(FeaturesCacheKeys.versionUser(userId));
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.featuresRepository.setTeamAutoOptIn(teamId, enabled);
    await Promise.all([
      this.bumpVersion(FeaturesCacheKeys.versionTeam(teamId)),
      this.bumpVersion(FeaturesCacheKeys.versionAccess()),
    ]);
  }
}
