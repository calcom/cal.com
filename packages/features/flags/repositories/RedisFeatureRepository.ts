import type { Feature } from "@calcom/prisma/client";

import type { IRedisService } from "../../redis/IRedisService";
import type { AppFlags, FeatureId } from "../config";
import { appFlagsSchema, featureArraySchema, featureSchema } from "./schemas";

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
}

export class RedisFeatureRepository implements IRedisFeatureRepository {
  constructor(
    private redisService: IRedisService,
    private ttlMs: number = DEFAULT_TTL_MS
  ) {}

  async findAll(): Promise<Feature[] | null> {
    const cached = await this.redisService.get<unknown>(KEY.all());
    if (cached === null) {
      return null;
    }
    const parsed = featureArraySchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as Feature[];
  }

  async setAll(features: Feature[], ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.all(), features, { ttl: ttlMs ?? this.ttlMs });
  }

  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    const cached = await this.redisService.get<unknown>(KEY.bySlug(slug));
    if (cached === null) {
      return null;
    }
    const parsed = featureSchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as Feature;
  }

  async setBySlug(slug: FeatureId, feature: Feature, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.bySlug(slug), feature, { ttl: ttlMs ?? this.ttlMs });
  }

  async getFeatureFlagMap(): Promise<AppFlags | null> {
    const cached = await this.redisService.get<unknown>(KEY.flagMap());
    if (cached === null) {
      return null;
    }
    const parsed = appFlagsSchema.safeParse(cached);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as AppFlags;
  }

  async setFeatureFlagMap(flags: AppFlags, ttlMs?: number): Promise<void> {
    await this.redisService.set(KEY.flagMap(), flags, { ttl: ttlMs ?? this.ttlMs });
  }
}
