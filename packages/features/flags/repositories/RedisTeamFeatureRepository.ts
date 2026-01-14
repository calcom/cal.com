import type { TeamFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../config";
import { teamFeaturesMapSchema, teamFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const DEFAULT_TTL_MS: number = 5 * 60 * 1000; // 5 minutes

const KEY = {
  enabledByTeamId: (teamId: number) => `${CACHE_PREFIX}:enabled:${teamId}`,
  byTeamIdAndFeatureId: (teamId: number, featureId: string) => `${CACHE_PREFIX}:${teamId}:${featureId}`,
  autoOptInByTeamId: (teamId: number) => `${CACHE_PREFIX}:autoOptIn:${teamId}`,
} as const;

export interface IRedisTeamFeatureRepository {
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  setEnabledByTeamId(teamId: number, features: TeamFeaturesMap, ttlMs?: number): Promise<void>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null>;
  setByTeamIdAndFeatureId(teamId: number, featureId: FeatureId, data: TeamFeatures, ttlMs?: number): Promise<void>;
  findAutoOptInByTeamId(teamId: number): Promise<boolean | null>;
  setAutoOptInByTeamId(teamId: number, enabled: boolean, ttlMs?: number): Promise<void>;
  invalidateByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<void>;
  invalidateAutoOptInByTeamId(teamId: number): Promise<void>;
}

export class RedisTeamFeatureRepository implements IRedisTeamFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
    const cached = await this.redisService.get<unknown>(KEY.enabledByTeamId(teamId));
    if (cached === null) {
      return null;
    }
    const parsed = teamFeaturesMapSchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as TeamFeaturesMap;
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

  async findAutoOptInByTeamId(teamId: number): Promise<boolean | null> {
    return this.redisService.get<boolean>(KEY.autoOptInByTeamId(teamId));
  }

  async setAutoOptInByTeamId(teamId: number, enabled: boolean, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.autoOptInByTeamId(teamId), enabled, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<void> {
    await this.redisService.del(KEY.byTeamIdAndFeatureId(teamId, featureId));
    await this.redisService.del(KEY.enabledByTeamId(teamId));
  }

  async invalidateAutoOptInByTeamId(teamId: number): Promise<void> {
    await this.redisService.del(KEY.autoOptInByTeamId(teamId));
  }
}
