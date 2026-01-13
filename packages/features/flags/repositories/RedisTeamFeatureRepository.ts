import type { TeamFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { FeatureId, FeatureState, TeamFeatures as TeamFeaturesMap } from "../config";
import { teamFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const KEY = {
  enabledByTeamId: (teamId: number) => `${CACHE_PREFIX}:enabled:${teamId}`,
  byTeamIdAndFeatureId: (teamId: number, featureId: string) => `${CACHE_PREFIX}:${teamId}:${featureId}`,
  byTeamIdsAndFeatureIds: (teamIds: number[], featureIds: string[]) => {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${CACHE_PREFIX}:batch:${sortedTeamIds}:${sortedFeatureIds}`;
  },
  autoOptInByTeamIds: (teamIds: number[]) => {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    return `${CACHE_PREFIX}:autoOptIn:${sortedTeamIds}`;
  },
} as const;

export interface IRedisTeamFeatureRepository {
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  setEnabledByTeamId(teamId: number, features: TeamFeaturesMap, ttlMs?: number): Promise<void>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null>;
  setByTeamIdAndFeatureId(teamId: number, featureId: FeatureId, data: TeamFeatures, ttlMs?: number): Promise<void>;
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
  invalidateByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<void>;
  invalidateAutoOptIn(teamIds: number[]): Promise<void>;
}

export class RedisTeamFeatureRepository implements IRedisTeamFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
    return this.redisService.get<TeamFeaturesMap>(KEY.enabledByTeamId(teamId));
  }

  async setEnabledByTeamId(teamId: number, features: TeamFeaturesMap, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.enabledByTeamId(teamId), features, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null> {
    const cached = await this.redisService.get<unknown>(KEY.byTeamIdAndFeatureId(teamId, featureId));
    if (cached === null) {
      return null;
    }
    const parsed = teamFeaturesSchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as TeamFeatures;
  }

  async setByTeamIdAndFeatureId(
    teamId: number,
    featureId: FeatureId,
    data: TeamFeatures,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(KEY.byTeamIdAndFeatureId(teamId, featureId), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>> | null> {
    return this.redisService.get<Partial<Record<FeatureId, Record<number, FeatureState>>>>(
      KEY.byTeamIdsAndFeatureIds(teamIds, featureIds)
    );
  }

  async setByTeamIdsAndFeatureIds(
    data: Partial<Record<FeatureId, Record<number, FeatureState>>>,
    teamIds: number[],
    featureIds: FeatureId[],
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(KEY.byTeamIdsAndFeatureIds(teamIds, featureIds), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean> | null> {
    return this.redisService.get<Record<number, boolean>>(KEY.autoOptInByTeamIds(teamIds));
  }

  async setAutoOptInByTeamIds(
    data: Record<number, boolean>,
    teamIds: number[],
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(KEY.autoOptInByTeamIds(teamIds), data, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<void> {
    await this.redisService.del(KEY.byTeamIdAndFeatureId(teamId, featureId));
    await this.redisService.del(KEY.enabledByTeamId(teamId));
  }

  async invalidateAutoOptIn(teamIds: number[]): Promise<void> {
    await this.redisService.del(KEY.autoOptInByTeamIds(teamIds));
  }
}
