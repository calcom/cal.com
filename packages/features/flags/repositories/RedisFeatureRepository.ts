import type { Feature } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { AppFlags, FeatureId } from "../config";

const CACHE_PREFIX = "features:global";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

  private getAllKey(): string {
    return `${CACHE_PREFIX}:all`;
  }

  private getBySlugKey(slug: FeatureId): string {
    return `${CACHE_PREFIX}:slug:${slug}`;
  }

  private getFlagMapKey(): string {
    return `${CACHE_PREFIX}:flagMap`;
  }

  async findAll(): Promise<Feature[] | null> {
    return this.redisService.get<Feature[]>(this.getAllKey());
  }

  async setAll(features: Feature[], ttlMs?: number): Promise<void> {
    await this.redisService.set(this.getAllKey(), features, { ttl: ttlMs ?? this.ttlMs });
  }

  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    return this.redisService.get<Feature>(this.getBySlugKey(slug));
  }

  async setBySlug(slug: FeatureId, feature: Feature, ttlMs?: number): Promise<void> {
    await this.redisService.set(this.getBySlugKey(slug), feature, { ttl: ttlMs ?? this.ttlMs });
  }

  async getFeatureFlagMap(): Promise<AppFlags | null> {
    return this.redisService.get<AppFlags>(this.getFlagMapKey());
  }

  async setFeatureFlagMap(flags: AppFlags, ttlMs?: number): Promise<void> {
    await this.redisService.set(this.getFlagMapKey(), flags, { ttl: ttlMs ?? this.ttlMs });
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.del(this.getAllKey());
    await this.redisService.del(this.getFlagMapKey());
  }
}
