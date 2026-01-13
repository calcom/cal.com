import type { Feature } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { AppFlags, FeatureId } from "../config";

const CACHE_PREFIX = "features:global";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const KEY = {
  all: () => `${CACHE_PREFIX}:all`,
  bySlug: (slug: string) => `${CACHE_PREFIX}:slug:${slug}`,
  flagMap: () => `${CACHE_PREFIX}:flagMap`,
} as const;

export interface IRedisFeatureRepository {
  findAll(): Promise<Feature[] | null>;
  setAll(features: Feature[], ttlMs?: number): Promise<void>;
  findBySlug(slug: FeatureId): Promise<Feature | null>;
  setBySlug(slug: FeatureId, feature: Feature, ttlMs?: number): Promise<void>;
  getFeatureFlagMap(): Promise<AppFlags | null>;
  setFeatureFlagMap(flags: AppFlags, ttlMs?: number): Promise<void>;
  invalidateAll(): Promise<void>;
}

export class RedisFeatureRepository implements IRedisFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  async findAll(): Promise<Feature[] | null> {
    return this.redisService.get<Feature[]>(KEY.all());
  }

  async setAll(features: Feature[], ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.all(), features, { ttl: ttlMs ?? this.ttlMs });
  }

  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    return this.redisService.get<Feature>(KEY.bySlug(slug));
  }

  async setBySlug(slug: FeatureId, feature: Feature, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.bySlug(slug), feature, { ttl: ttlMs ?? this.ttlMs });
  }

  async getFeatureFlagMap(): Promise<AppFlags | null> {
    return this.redisService.get<AppFlags>(KEY.flagMap());
  }

  async setFeatureFlagMap(flags: AppFlags, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.flagMap(), flags, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.del(KEY.all());
    await this.redisService.del(KEY.flagMap());
  }
}
