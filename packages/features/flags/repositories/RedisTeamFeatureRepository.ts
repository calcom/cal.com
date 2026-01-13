import type { IRedisService } from "../../redis/IRedisService";
import type { FeatureId, FeatureState, TeamFeatures as TeamFeaturesMap } from "../config";

const CACHE_PREFIX = "features:team";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface IRedisTeamFeatureRepository {
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  setEnabledByTeamId(teamId: number, features: TeamFeaturesMap, ttlMs?: number): Promise<void>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<boolean | null>;
  setByTeamIdAndFeatureId(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    ttlMs?: number
  ): Promise<void>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>> | null>;
  setByTeamIdsAndFeatureIds(
    data: Partial<Record<FeatureId, Record<number, FeatureState>>>,
    teamIds: number[],
    featureIds: FeatureId[],
    ttlMs?: number
  ): Promise<void>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean> | null>;
  setAutoOptInByTeamIds(data: Record<number, boolean>, teamIds: number[], ttlMs?: number): Promise<void>;
  invalidateByTeamId(teamId: number): Promise<void>;
  invalidateAutoOptIn(teamIds: number[]): Promise<void>;
}

export class RedisTeamFeatureRepository implements IRedisTeamFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  private getEnabledByTeamIdKey(teamId: number): string {
    return `${CACHE_PREFIX}:enabled:${teamId}`;
  }

  private getByTeamIdAndFeatureIdKey(teamId: number, featureId: FeatureId): string {
    return `${CACHE_PREFIX}:${teamId}:${featureId}`;
  }

  private getByTeamIdsAndFeatureIdsKey(teamIds: number[], featureIds: FeatureId[]): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${CACHE_PREFIX}:batch:${sortedTeamIds}:${sortedFeatureIds}`;
  }

  private getAutoOptInKey(teamIds: number[]): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    return `${CACHE_PREFIX}:autoOptIn:${sortedTeamIds}`;
  }

  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
    return this.redisService.get<TeamFeaturesMap>(this.getEnabledByTeamIdKey(teamId));
  }

  async setEnabledByTeamId(teamId: number, features: TeamFeaturesMap, ttlMs?: number): Promise<void> {
    await this.redisService.set(this.getEnabledByTeamIdKey(teamId), features, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<boolean | null> {
    return this.redisService.get<boolean>(this.getByTeamIdAndFeatureIdKey(teamId, featureId));
  }

  async setByTeamIdAndFeatureId(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(this.getByTeamIdAndFeatureIdKey(teamId, featureId), enabled, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>> | null> {
    return this.redisService.get<Partial<Record<FeatureId, Record<number, FeatureState>>>>(
      this.getByTeamIdsAndFeatureIdsKey(teamIds, featureIds)
    );
  }

  async setByTeamIdsAndFeatureIds(
    data: Partial<Record<FeatureId, Record<number, FeatureState>>>,
    teamIds: number[],
    featureIds: FeatureId[],
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(this.getByTeamIdsAndFeatureIdsKey(teamIds, featureIds), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean> | null> {
    return this.redisService.get<Record<number, boolean>>(this.getAutoOptInKey(teamIds));
  }

  async setAutoOptInByTeamIds(
    data: Record<number, boolean>,
    teamIds: number[],
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(this.getAutoOptInKey(teamIds), data, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateByTeamId(teamId: number): Promise<void> {
    await this.redisService.del(this.getEnabledByTeamIdKey(teamId));
  }

  async invalidateAutoOptIn(teamIds: number[]): Promise<void> {
    await this.redisService.del(this.getAutoOptInKey(teamIds));
  }
}
