import type { UserFeatures } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { FeatureId, FeatureState } from "../config";
import { userFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:user";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const KEY = {
  byUserIdAndFeatureId: (userId: number, featureId: string) => `${CACHE_PREFIX}:${userId}:${featureId}`,
  byUserIdAndFeatureIds: (userId: number, featureIds: string[]) => {
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${CACHE_PREFIX}:batch:${userId}:${sortedFeatureIds}`;
  },
  autoOptInByUserId: (userId: number) => `${CACHE_PREFIX}:autoOptIn:${userId}`,
} as const;

export interface IRedisUserFeatureRepository {
  findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null>;
  setByUserIdAndFeatureId(userId: number, featureId: string, data: UserFeatures, ttlMs?: number): Promise<void>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>> | null>;
  setByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[],
    data: Partial<Record<FeatureId, FeatureState>>,
    ttlMs?: number
  ): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean | null>;
  setAutoOptInByUserId(userId: number, enabled: boolean, ttlMs?: number): Promise<void>;
  invalidateByUserIdAndFeatureId(userId: number, featureId: string): Promise<void>;
  invalidateAutoOptIn(userId: number): Promise<void>;
}

export class RedisUserFeatureRepository implements IRedisUserFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  async findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null> {
    const cached = await this.redisService.get<unknown>(KEY.byUserIdAndFeatureId(userId, featureId));
    if (cached === null) {
      return null;
    }
    const parsed = userFeaturesSchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as UserFeatures;
  }

  async setByUserIdAndFeatureId(
    userId: number,
    featureId: string,
    data: UserFeatures,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(KEY.byUserIdAndFeatureId(userId, featureId), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>> | null> {
    return this.redisService.get<Partial<Record<FeatureId, FeatureState>>>(
      KEY.byUserIdAndFeatureIds(userId, featureIds)
    );
  }

  async setByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[],
    data: Partial<Record<FeatureId, FeatureState>>,
    ttlMs?: number
  ): Promise<void> {
    await this.redisService.set(KEY.byUserIdAndFeatureIds(userId, featureIds), data, {
      ttl: ttlMs ?? this.ttlMs,
    });
  }

  async findAutoOptInByUserId(userId: number): Promise<boolean | null> {
    return this.redisService.get<boolean>(KEY.autoOptInByUserId(userId));
  }

  async setAutoOptInByUserId(userId: number, enabled: boolean, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.autoOptInByUserId(userId), enabled, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateByUserIdAndFeatureId(userId: number, featureId: string): Promise<void> {
    await this.redisService.del(KEY.byUserIdAndFeatureId(userId, featureId));
  }

  async invalidateAutoOptIn(userId: number): Promise<void> {
    await this.redisService.del(KEY.autoOptInByUserId(userId));
  }
}
